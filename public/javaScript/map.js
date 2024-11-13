mapboxgl.accessToken =  mapToken;
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: volunteer.geometry.coordinates,
    zoom: 9
});

map.addControl(new mapboxgl.NavigationControl());

new mapboxgl.Marker()
    .setLngLat(volunteer.geometry.coordinates)
    .addTo(map);

