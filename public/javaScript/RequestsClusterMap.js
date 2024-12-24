mapboxgl.accessToken = mapToken;

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11', 
    center: donorCoordinates, 
    zoom: 10 
});

map.addControl(new mapboxgl.NavigationControl());

const donorMarker = new mapboxgl.Marker({ color: 'green' })
    .setLngLat(donorCoordinates)
    .setPopup(new mapboxgl.Popup({ offset: 25 })
        .setHTML(`<h5>Your Location</h5>`))
    .addTo(map);

function addMarkers(requests, color) {
    requests.forEach(request => {
        const marker = new mapboxgl.Marker({ color })
            .setLngLat(request.geometry.coordinates)
            .setPopup(new mapboxgl.Popup({ offset: 25 })
                .setHTML(`<h5>${request.requester_name}</h5><p>${request.location}</p><p>${request.foodtype}</p>`))
            .addTo(map);

        marker.getElement().addEventListener('click', () => {
            getRoute(donorCoordinates, request.geometry.coordinates);
        });
    });
}

function getRoute(start, end) {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const route = data.routes[0].geometry;
            const distance = (data.routes[0].distance / 1000).toFixed(2); 

            if (map.getSource('route')) {
                map.removeLayer('route');
                map.removeSource('route');
            }

            map.addLayer({
                id: 'route',
                type: 'line',
                source: {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: route
                    }
                },
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#3887be',
                    'line-width': 5,
                    'line-opacity': 0.75
                }
            });

            const popup = new mapboxgl.Popup({ closeOnClick: false })
                .setLngLat(end)
                .setHTML(`<h5>Distance: ${distance} km</h5>`)
                .addTo(map);
        })
        .catch(error => {
            console.error('Error fetching route:', error);
        });
}

const nearbyRequests = JSON.parse(document.getElementById('nearbyRequestListData').textContent);
const allRequests = JSON.parse(document.getElementById('requestListData').textContent);

addMarkers(nearbyRequests, 'red');

addMarkers(allRequests, 'blue');
