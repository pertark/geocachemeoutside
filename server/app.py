from shapely.geometry import Point
from scipy.spatial import KDTree
import geopandas as gpd
import numpy as np
import networkx as nx
from shapely.geometry import LineString

gdf = gpd.read_file('gdb/build_sidewalk_build_sidewalk.shp')

# If not, reproject to WGS84
if gdf.crs.to_epsg() != 4326:
    gdf = gdf.to_crs(epsg=4326)

# Normalize any missing columns
gdf["Shape_Leng"] = gdf["Shape_Leng"].fillna(0)
gdf["m5_5_sidew"] = gdf["m5_5_sidew"].fillna(0)
gdf["m8_1_urban"] = gdf["m8_1_urban"].fillna(0)
gdf["m9_2_stree"] = gdf["m9_2_stree"].fillna(0)

# Compute a custom routing cost
gdf["custom_cost"] = (
    gdf["Shape_Leng"] * 1.0
    - gdf["m5_5_sidew"] * 0.5       # more sidewalk = better
    - gdf["m9_2_stree"] * 0.3       # better street = easier routing
    - gdf["m8_1_urban"] * 0.2       # more urban = possibly flatter/better infra
)

gdf["shade_score"] = np.random.uniform(0, 1, len(gdf))
gdf["slope_score"] = np.random.uniform(0, 10, len(gdf))  # in degrees

gdf["custom_cost"] += gdf["slope_score"] * 1.5 - gdf["shade_score"] * 1.0


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
        return path
    else:
        print("No path found between source and target")
        return None

    try:
        #Dijkstra's algorithm, weight is the cost_field
        path = nx.shortest_path(G, source=source, target=target, weight="weight")
        return path
    except nx.NetworkXNoPath:
        print("No path found between source and target")
        return None

# convert to linestring

from shapely.geometry import LineString

def path_to_linestring(path):
    print("path2linestring", path)
    if not path:
        return None

    # Combine geometries along the path
    segments = [
        G[path[i]][path[i+1]]["geometry"] for i in range(len(path) - 1)
    ]
    coords = [pt for line in segments for pt in line.coords]
    return LineString(coords)

# export to geojson for web
import json

from geojson import Feature, FeatureCollection, dumps

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
        print(path)
        linestring = path_to_linestring(path)                 
        print(linestring)
        geojson = route_to_geojson(linestring)
        print(geojson)
 
        return jsonify(geojson)
 
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=True)
