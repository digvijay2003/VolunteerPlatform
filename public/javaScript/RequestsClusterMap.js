// Fetch Mapbox token from the environment
mapboxgl.accessToken = mapToken;

const map = new mapboxgl.Map({
    container: 'map', // ID of the map container
    style: 'mapbox://styles/mapbox/streets-v11', // Map style
    center: donorCoordinates, // Initial map center [lng, lat]
    zoom: 10 // Initial zoom level
});

// Add navigation controls to the map
map.addControl(new mapboxgl.NavigationControl());

// Add the donor marker to the map
const donorMarker = new mapboxgl.Marker({ color: 'green' })
    .setLngLat(donorCoordinates)
    .setPopup(new mapboxgl.Popup({ offset: 25 })
        .setHTML(`<h5>Your Location</h5>`))
    .addTo(map);

// Function to add markers to the map
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

// Function to get the route from the donor to the request
function getRoute(start, end) {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const route = data.routes[0].geometry;
            const distance = (data.routes[0].distance / 1000).toFixed(2); // Convert to kilometers

            // If a route layer already exists, remove it
            if (map.getSource('route')) {
                map.removeLayer('route');
                map.removeSource('route');
            }

            // Add the new route layer
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

            // Show distance information
            const popup = new mapboxgl.Popup({ closeOnClick: false })
                .setLngLat(end)
                .setHTML(`<h5>Distance: ${distance} km</h5>`)
                .addTo(map);
        })
        .catch(error => {
            console.error('Error fetching route:', error);
        });
}

// Parse request data from the script tags
const nearbyRequests = JSON.parse(document.getElementById('nearbyRequestListData').textContent);
const allRequests = JSON.parse(document.getElementById('requestListData').textContent);

// Add markers for nearby requests with a different color
addMarkers(nearbyRequests, 'red');

// Add markers for all requests
addMarkers(allRequests, 'blue');
