from shapely.geometry import Point
from scipy.spatial import KDTree
import geopandas as gpd
import numpy as np
import networkx as nx
from shapely.geometry import LineString

gdf = gpd.read_file('gdb/build_sidewalk.shp')


# If not, reproject to WGS84
if gdf.crs.to_epsg() != 4326:
    gdf = gdf.to_crs(epsg=4326)


gdf = gdf.rename(columns={
    'm9_2_stree': 'Lighting_Raw',
    'm9_5_HIN': 'Injury_Raw',
    'm8_2_parks': 'Parks_Raw',
    'm8_1_urban': 'TreeCanopy_Raw'
})

gdf["SHAPE_Leng"] = gdf["SHAPE_Leng"].fillna(0)
gdf["Lighting_Raw"] = gdf["Lighting_Raw"].fillna(0)
gdf["Injury_Raw"] = gdf["Injury_Raw"].fillna(0)
gdf["Parks_Raw"] = gdf["Parks_Raw"].fillna(0)
gdf["TreeCanopy_Raw"] = gdf["TreeCanopy_Raw"].fillna(0)

from sklearn.preprocessing import MinMaxScaler

columns_to_normalize = ["SHAPE_Leng"]
scaler = MinMaxScaler()

gdf[columns_to_normalize] = scaler.fit_transform(gdf[columns_to_normalize])

gdf["custom_cost"] = (
    gdf["SHAPE_Leng"] +
    # gdf["SHAPE_Leng"] * 10.5 +                        # baseline routing cost
    (1 - gdf["TreeCanopy_Raw"]) * 0.5 +              # more trees = lower cost
    (1 - gdf["Parks_Raw"]) * 0.4 +                   # more parks = lower cost
    (1 - gdf["Lighting_Raw"]) * 0.3 +                # more light = lower cost
    gdf["Injury_Raw"] * 0.8                          # more injuries = higher cost
)


# Use your precomputed cost
cost_field = "custom_cost"

G = nx.Graph()

for idx, row in gdf.iterrows():
    geom = row.geometry
    if not isinstance(geom, LineString):
        continue  # skip if not LineString

    #start = tuple(geom.coords[0])
    #end = tuple(geom.coords[-1])

    # Only (lon, lat)
    start = tuple(geom.coords[0][:2])
    end = tuple(geom.coords[-1][:2])

    cost = row[cost_field]

    # Add edge with attributes
    G.add_edge(
        start,
        end,
        weight=cost,
        geometry=geom
    )

min_weight = min([d["weight"] for _, _, d in G.edges(data=True)])
print("Minimum edge weight:", min_weight)

neg_weights = gdf[gdf["custom_cost"] < 0]
print(f"Number of rows with negative weights: {len(neg_weights)}")


# validate the graph
print(f"Graph has {G.number_of_nodes()} nodes and {G.number_of_edges()} edges")

# Build KDTree for fast spatial lookup
nodes = list(G.nodes)
kdtree = KDTree(nodes)

def snap_to_node(coord):
    dist, idx = kdtree.query([coord])
    return nodes[int(idx)]

# compute shortest path

def compute_path(start_coord, end_coord):
    source = snap_to_node(start_coord)
    target = snap_to_node(end_coord)

    print("Start coordinate:", start_coord)
    print("End coordinate:", end_coord)
    print("Snapped source:", source)
    print("Snapped target:", target)

    if nx.has_path(G, source, target):
        print("A path exists between source and target")
        path = nx.shortest_path(G, source=source, target=target, weight="weight")
        print("This path has total weight", nx.path_weight(G, path=path, weight="weight"))
        return path
    else:
        print("No path found between source and target")
        return None

# convert to linestring

from shapely.geometry import LineString

def path_to_linestring(path):
    if not path:
        return None

    # Combine geometries along the path
    segments = [
        G[path[i]][path[i+1]]["geometry"] for i in range(len(path) - 1)
    ]
    # coords = [pt for line in segments for pt in line.coords]
    coords = [LineString(line.coords) for line in segments]
    return coords
    # return LineString(coords)

from geojson import Feature, FeatureCollection, dumps

def segs_to_geojson(segments):
    if not segments:
        return {}
    features = [Feature(geometry=segment, properties={}) for segment in segments]
    return FeatureCollection(features)

def route_to_geojson(linestring):
    if not linestring:
        return {}
    feature = Feature(geometry=linestring, properties={})
    return FeatureCollection([feature])


from flask import Flask, request, jsonify
from flask_cors import CORS
from shapely.geometry import LineString
from geojson import Feature, FeatureCollection, dumps
 
app = Flask(__name__)
CORS(app)
@app.route("/route")
def route():
    try:
        start = request.args.get("start")  # e.g., "-117.189,34.050"
        end = request.args.get("end")      # e.g., "-117.183,34.065"

        start_coord = tuple(map(float, start.split(",")))
        end_coord = tuple(map(float, end.split(",")))

        path = compute_path(start_coord, end_coord)
        linestring = path_to_linestring(path)
        # geojson = route_to_geojson(linestring)
        geojson = segs_to_geojson(linestring)

        return jsonify(geojson)
 
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=True)
