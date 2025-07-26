import * as React from 'react';
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-search";
// https://developers.arcgis.com/javascript/latest/references/map-components/arcgis-map/#properties
// https://developers.arcgis.com/javascript/latest/references/map-components/arcgis-search/
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-legend";

import Graphic from "@arcgis/core/Graphic.js";
import { CalciteChip, CalciteChipGroup } from "@esri/calcite-components-react";

function App() {
    const [activeChip, setActiveChip] = React.useState<string>("");
    const handleViewReady = (event) => {
        console.log(event)
        const viewElement = event.target;

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

    const [currentRoute, setCurrentRoute] = React.useState([]);
    const fetchRoute = () => {
        const fromMaps = (x, y) => [y, x];
        const start = fromMaps(38.900336, -77.036221).join(',');
        const end = fromMaps(38.905625, -77.021898).join(',');
        fetch(`http://localhost:5000/route?start=${start}&end=${end}`)
            .then(x => x.text())
            .then((x) => console.log(x))
    }
    return (
        <div>
            <arcgis-map basemap="dark-gray" zoom="14" onarcgisViewReadyChange={handleViewReady}>
                <div className='flex md:flex-row flex-col'>
                    <arcgis-search
                        all-placeholder="Where are you walking to?"
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
