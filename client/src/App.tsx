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
    const [activeChips, setActiveChips] = React.useState<string[]>([]);
    const [showTooltip, setShowTooltip] = React.useState(true);
    const [currentRoute, setCurrentRoute] = React.useState([]);
    const [routeFraction, setRouteFraction] = React.useState(1); // 1 = 100%
    const [selectingPoint, setSelectingPoint] = React.useState(false);
    const [selectedLatLng, setSelectedLatLng] = React.useState<{lat: number, lng: number} | null>(null);
    const [pointMode, setPointMode] = React.useState<"start" | "end">("start");
    const [startPoint, setStartPoint] = React.useState<{ lat: number, lng: number } | null>(null);
    const [endPoint, setEndPoint] = React.useState<{ lat: number, lng: number } | null>(null);
    const startMarkerRef = React.useRef<any>(null);
    const endMarkerRef = React.useRef<any>(null);

    const handleViewReady = (event) => {
        console.log(event)
        const viewElement = event.target;
        mapView.current = viewElement;

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
        console.log("active chips", activeChips);
        const modeToColor = {
            normal_cost: "purple",
            night_cost: "blue",
            green_cost: "green"
        }
        console.log("fetching route from", startPoint, "to", endPoint);
        // const start = fromMaps(38.900336, -77.036221);
        // const end = fromMaps(38.9204575,-77.07953);

        // const end = fromMaps(38.916569,-77.0314635);
        const start = startPoint ? [startPoint.lng, startPoint.lat] : [0, 0];
        const end = endPoint ? [endPoint.lng, endPoint.lat] : [0, 0];
        console.log("start", start, "end", end);

        if (activeChips.length === 0) {
            console.warn("No active chips selected, defaulting to normal route");
            activeChips.push("normal_cost");
        }
        for (const cost of activeChips) {
            const renderer = {
                type: "simple", // Autocasts as new SimpleRenderer()
                symbol: {
                    type: "simple-line", // Change from "simple-marker" to "simple-line"
                    color: modeToColor[cost] || "purple",
                    width: 4
                }
            };
            const geojsonLayer = new GeoJSONLayer({
                url: `http://localhost:5000/route?start=${start.join(',')}&end=${end.join(',')}&cost=${cost}`, 
                renderer: renderer
            });
            mapView.current.map.add(geojsonLayer);
        }
        
        // addMarker(start, "blue", "circle");
        // addMarker(end, "red", "triangle");
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

    // Helper to clear previous markers
    const clearMarker = (ref) => {
        if (mapView.current && ref.current) {
            mapView.current.graphics.remove(ref.current);
            ref.current = null;
        }
    };

    // Place a marker for start or end
    const placeMarker = (lng: number, lat: number, mode: "start" | "end") => {
        if (!mapView.current) return;
        if (mode === "start") clearMarker(startMarkerRef);
        if (mode === "end") clearMarker(endMarkerRef);

        const point = {
            type: "point",
            longitude: lng,
            latitude: lat,
        };
        const markerSymbol = {
            type: "simple-marker",
            style: mode === "start" ? "diamond" : "circle",
            size: 15,
            color: mode === "start" ? "orange" : "blue",
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

        if (mode === "start") {
            startMarkerRef.current = pointGraphic;
            setStartPoint({ lat, lng });
            setPointMode("end"); // Automatically switch to end point mode
        } else {
            endMarkerRef.current = pointGraphic;
            setEndPoint({ lat, lng });
        }
    };

    // Handler for search select event
    const handleSearchSelect = (event) => {
        const result = event.detail?.results?.[0]?.results?.[0];
        if (result && result.feature && result.feature.geometry) {
            const { latitude, longitude } = result.feature.geometry;
            placeMarker(longitude, latitude, pointMode);
        }
    };

    // Map click handler for "select point on map"
    React.useEffect(() => {
        if (!mapView.current) return;
        let handler;
        if (selectingPoint) {
            handler = mapView.current.view.on("click", (event) => {
                const { latitude, longitude } = event.mapPoint;
                placeMarker(longitude, latitude, pointMode);
                setSelectingPoint(false);
            });
        }
        return () => {
            if (handler) handler.remove();
        };
        // eslint-disable-next-line
    }, [selectingPoint, pointMode]);

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
                // addMarker([longitude, latitude], "orange", "diamond");
            });
        }
        return () => {
            if (handler) handler.remove();
        };
        // eslint-disable-next-line
    }, [selectingPoint]);

    return (
        <div>
            {/* Tooltip Modal */}
            {showTooltip && (
                <div
                  className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg p-6 z-50 max-w-md border pointer-events-auto"
                  style={{ minWidth: 320 }}
                >
                  <div className="flex flex-col gap-2">
                    <div className="text-lg mb-1"><span className='font-bold'>Walk This Way</span> personalizes your walking path based on your selected preferences. </div>
                    <div>
                      <span role="img" aria-label="tree">🌳</span>
                      <b>Trees/shade:</b> Paths with high tree coverage and access to parks.<br />
                      <span role="img" aria-label="night mode">🌙</span>
                      <b>Night mode:</b> Paths with street lamps with pass through areas with low crime.  <br />
                      <span role="img" aria-label="holistic mode">🚸</span>
                      <b>Holistic mode:</b> Paths that combine both Green Mode and Night Mode.
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
                        all-placeholder={`Where is your ${pointMode === "start" ? "start" : "end"} point?`}
                        onarcgisSearchComplete={handleSearchSelect}
                    ></arcgis-search>
                </div>
            </arcgis-map>

            <div id="map-overlay" className="absolute top-0 left-0 w-full pointer-events-none z-50 pt-[12px]">
                <div className="flex flex-row gap-2">
                    <div className='ml-[250px] w-[1px] h-[38px]'></div>
                    <div className='pointer-events-auto'>
                        <calcite-button
                            className="mr-2 text-white h-[36px]"
                            onClick={() => setSelectingPoint(true)}
                            disabled={selectingPoint}
                        >
                            {selectingPoint ? "Click on map..." : "or select a point on map"}
                        </calcite-button>
                    </div>
                    {/* Toggle Switch */}
                    <div className="pointer-events-auto">
                        <calcite-button
                            className={`mr-2 h-[36px]`}
                            style={{ '--calcite-button-background-color': pointMode === "start" ? "orange" : "blue",
                                '--calcite-button-text-color': pointMode === "start" ? "black" : "white"
                             }}
                            onClick={() => setPointMode("start" === pointMode ? "end" : "start")}
                        >
                            {pointMode === "start" ? "🔶 Set start point" : "🔵 Set end point"}
                        </calcite-button>
                    </div>
                    <div className="pointer-events-auto">
                        <calcite-button
                            className={`mr-2 h-[36px]`}
                            style={{ '--calcite-button-background-color': 'green' }}
                            onClick={fetchRoute}
                        >
                            Find Route!
                        </calcite-button>
                    </div>
                    {/* "or select a point on map" button */}
                    <div className='pointer-events-auto'>
        
                        <div className='pt-[6px] pointer-events-auto'>
                            <CalciteChipGroup
                                selection-mode="multiple"
                                scale="s"
                                oncalciteChipGroupSelect={(e) => {
                                    console.log("Chip selected:", e);
                                  const selectedValues = (e.target as HTMLCalciteChipGroupElement)
                                    .selectedItems?.map(item => item.value) || [];
                                  setActiveChips(selectedValues);
                                }}
                              >
                                
                                <CalciteChip value="green_cost" label="green" className="green-chip">Green</CalciteChip>
                                <CalciteChip value="night_cost" label="night" className="night-chip">Night</CalciteChip>
                                <CalciteChip value="normal_cost" label="holistic" className="holistic-chip">Holistic</CalciteChip>

                          </CalciteChipGroup>
                        </div>
                        {/* <button onClick={fetchRoute}>test</button> */}
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
