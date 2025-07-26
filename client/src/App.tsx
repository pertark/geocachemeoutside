import * as React from 'react';
import "@arcgis/map-components/components/arcgis-map";
import Map from "@arcgis/core/Map.js";
import Basemap from "@arcgis/core/Basemap.js";
import MapView from "@arcgis/core/views/MapView.js";

function App() {
    const mapRef = React.useRef(null);
    // const basemap = new Basemap({
    //   portalItem: {
    //     id: "8dda0e7b5e2d4fafa80132d59122268c" // WGS84 Streets Vector webmap
    //   }
    // });
    React.useEffect(() => {
        const map = new Map({
          basemap: "dark-gray" // try "streets", "satellite", "dark-gray", etc.
        });

        const view = new MapView({
            container: mapRef.current,
            map: map,
            center: [-117.1951723, 34.0567497], // longitude, latitude
            zoom: 14.
        });

        return () => {
            view.destroy();
        }
    }, []);

    return (
        <div 
            style={{ height: "100vh", width: "100%" }}
            ref={mapRef}>
        </div>
    )
}

export default App;
