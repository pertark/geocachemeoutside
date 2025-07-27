import * as React from 'react';
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-search";
// https://developers.arcgis.com/javascript/latest/references/map-components/arcgis-map/#properties
// https://developers.arcgis.com/javascript/latest/references/map-components/arcgis-search/
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-legend";

import Graphic from "@arcgis/core/Graphic.js";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import { CalciteChip, CalciteChipGroup } from "@esri/calcite-components-react";

function App() {
    const mapView = React.useRef(null);
    const [activeChip, setActiveChip] = React.useState<string>("");
    const [showTooltip, setShowTooltip] = React.useState(true);
    const [currentRoute, setCurrentRoute] = React.useState([]);
    const [routeFraction, setRouteFraction] = React.useState(1); // 1 = 100%
    const [selectingPoint, setSelectingPoint] = React.useState(false);
    const [selectedLatLng, setSelectedLatLng] = React.useState<{lat: number, lng: number} | null>(null);

    const handleViewReady = (event) => {
        console.log(event)
        const viewElement = event.target;
        mapView.current = viewElement;

        // 38.8894541,-77.0377464
        const point = {
          type: "point",
          longitude: -77.0352464,
          latitude: 38.8894541,
        };

        const markerSymbol = {
          type: "simple-marker",
          style: "triangle",
          size: 15,
          color: "red",
          outline: {
            color: "white",
            width: 2,
          },
        };

        const pointGraphic = new Graphic({
          geometry: point,
          symbol: markerSymbol,
        });

        viewElement.graphics.add(pointGraphic);
        viewElement.zoom = 14
        viewElement.center = [-77.0352464, 38.8894541]
    };

    const addMarker = ([x, y], color, style) => {
        if (mapView.current == null) return;

        const point = {
          type: "point",
          longitude: x,
          latitude: y,
        };

        const markerSymbol = {
          type: "simple-marker",
          style: style || "triangle",
          size: 15,
          color: color || "red",
          outline: {
            color: "white",
            width: 2,
          },
        };

        const pointGraphic = new Graphic({
          geometry: point,
          symbol: markerSymbol,
        });

        mapView.current.graphics.add(pointGraphic);
    };


    const fetchRoute = () => {
        const fromMaps = (x, y) => [y, x];
        const start = fromMaps(38.900336, -77.036221);
        // const end = fromMaps(38.9204575,-77.07953);

        const end = fromMaps(38.916569,-77.0314635);
        console.log("start", start, "end", end);

        const renderer = {
            type: "simple", // Autocasts as new SimpleRenderer()
            symbol: {
                type: "simple-line", // Change from "simple-marker" to "simple-line"
                color: "green",
                width: 4
            }
        };
        const geojsonLayer = new GeoJSONLayer({
            url: `http://localhost:5000/route?start=${start.join(',')}&end=${end.join(',')}`, 
            renderer: renderer
        });
        mapView.current.map.add(geojsonLayer);
        addMarker(start, "blue", "circle");
        addMarker(end, "red", "triangle");
        // fetch(`http://localhost:5000/route?start=${start.join(',')}&end=${end.join(',')}`)
        //     .then(x => x.json())
        //     .then((x) => x.features[0].geometry.coordinates)
        //     .then((coordList) => {
        //         // setCurrentRoute(coordList);
        //         // displayRoute(coordList, routeFraction);
                
                
        //     })
    }

    // Update route when slider changes
    React.useEffect(() => {
        if (currentRoute.length > 1) {
            displayRoute(currentRoute, routeFraction);
        }
        // eslint-disable-next-line
    }, [routeFraction]);

    // Accepts a fraction (0-1) to show partial route
    const displayRoute = (coordList, fraction = 1) => {
      if (!mapView.current || !Array.isArray(coordList) || coordList.length < 2) return;

      // Remove previous route graphics
      mapView.current.graphics.removeAll();

      // Calculate how many points to show
      const totalPoints = coordList.length;
      const showCount = Math.max(2, Math.round(totalPoints * fraction));
      const partialCoords = coordList.slice(0, showCount);

      const polyline = {
        type: "polyline",
        paths: [partialCoords.map(([lat, lon, _]) => [lat, lon])], // [longitude, latitude]
      };

      const lineSymbol = {
        type: "simple-line",
        color: [0, 255, 255, 0.8],
        width: 4,
      };

      const polylineGraphic = new Graphic({
        geometry: polyline,
        symbol: lineSymbol,
      });

      mapView.current.graphics.add(polylineGraphic);
    }

    // Add map click handler for point selection
    React.useEffect(() => {
        if (!mapView.current) return;
        const view = mapView.current.view;

        let handler;
        if (selectingPoint) {
            handler = view.on("click", (event) => {
                const { latitude, longitude } = event.mapPoint;
                console.log("Selected point:", latitude, longitude);
                setSelectedLatLng({ lat: latitude, lng: longitude });
                setSelectingPoint(false);

                // Optionally add a marker at the selected point
                addMarker([longitude, latitude], "orange", "diamond");
            });
        }
        return () => {
            if (handler) handler.remove();
        };
        // eslint-disable-next-line
    }, [selectingPoint]);

    // Handler for search select event
    const handleSearchSelect = (event) => {
        event.preventDefault(); // Prevent default pan/zoom
        const result = event.detail?.result;
        if (result && result.feature && result.feature.geometry) {
            const { latitude, longitude } = result.feature.geometry;
            // Do what you want with the coordinates:
            setSelectedLatLng({ lat: latitude, lng: longitude });
            addMarker([longitude, latitude], "purple", "circle");
        }
    };

    return (
        <div>
            {/* Tooltip Modal */}
            {showTooltip && (
                <div
                  className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg p-6 z-50 max-w-md border pointer-events-auto"
                  style={{ minWidth: 320 }}
                >
                  <div className="flex flex-col gap-2">
                    <div className="font-bold text-lg mb-1">Walk This Way</div>
                    <div>
                      Walk This Way personalizes your walking path based on your selected preferences. <br />
                      <span role="img" aria-label="tree">🌳</span>
                      <b>Trees/shade:</b> Paths with high tree coverage<br />
                      <span role="img" aria-label="slope">⛰️</span>
                      <b>Slope:</b> Paths with low slope<br />
                      <span role="img" aria-label="accessibility">♿</span>
                      <b>Accessibility:</b> Paths with presence of curb cuts and ramps<br />
                      <span role="img" aria-label="night mode">🌙</span>
                      <b>Night mode:</b> Paths that are well-lit at night<br />
                    </div>
                    <button
                      className="self-end mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      onClick={() => setShowTooltip(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
            )}
            <arcgis-map basemap="dark-gray" zoom="14" onarcgisViewReadyChange={handleViewReady}>
                <div className='flex md:flex-row flex-col'>
                    <arcgis-search
                        className="z-10"
                        all-placeholder="Where are you walking to?"
                        onArcgisSearchSelect={handleSearchSelect}
                    ></arcgis-search>     
                </div>
            </arcgis-map>
            <div id="map-overlay" className="absolute top-0 p-[12px] w-screen pointer-events-none">
                <div className="flex md:flex-row flex-col ">
                    <div className='ml-[250px] w-[1px] h-[38px]' ></div>
                    <div className='pointer-events-auto'>
                        <div className='pt-[6px] pointer-events-auto'>
                            <CalciteChipGroup
                                selection-mode="single"
                                scale="s"
                                onCalciteChipSelect={(e) => {
                                  const selectedValue = (e.target as HTMLCalciteChipGroupElement)
                                    .selectedItems?.[0]?.value;
                                  setActiveChip(selectedValue || "");
                                }}
                              >
                                <CalciteChip value="streets" label="streets">Streets</CalciteChip>
                                <CalciteChip value="satellite" label="satellite">Satellite</CalciteChip>
                                <CalciteChip value="terrain" label="terrain">Terrain</CalciteChip>
                          </CalciteChipGroup>
                        </div>
                        <button onClick={fetchRoute}>test</button>
                        <button
                            className="mt-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                            onClick={() => setSelectingPoint(true)}
                            disabled={selectingPoint}
                        >
                            {selectingPoint ? "Click on map..." : "Select Point on Map"}
                        </button>
                        {selectedLatLng && (
                            <div className="mt-2 text-sm">
                                Selected: <b>Lat:</b> {selectedLatLng.lat.toFixed(6)}, <b>Lng:</b> {selectedLatLng.lng.toFixed(6)}
                            </div>
                        )}
                        {/* Slider for route fraction */}
                        {currentRoute.length > 1 && (
                          <div className="mt-4">
                            <label htmlFor="route-slider" className="block text-sm mb-1">Show portion of route:</label>
                            <input
                              id="route-slider"
                              type="range"
                              min={0.05}
                              max={1}
                              step={0.01}
                              value={routeFraction}
                              onChange={e => setRouteFraction(Number(e.target.value))}
                              style={{ width: 200 }}
                            />
                            <span className="ml-2">{Math.round(routeFraction * 100)}%</span>
                          </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
                    // <div>
                    //     <button>Slope</button> 
                    //     <button>Greenery</button> 
                    //     <button>Accessibility</button> 
                    // </div>
                    // <calcite-chip-group selection-mode="single" label="Select layer filter">
                    //     <calcite-chip value="streets">Streets</calcite-chip>
                    //     <calcite-chip value="satellite">Satellite</calcite-chip>
                    //     <calcite-chip value="terrain">Terrain</calcite-chip>
                    // </calcite-chip-group>

export default App;
