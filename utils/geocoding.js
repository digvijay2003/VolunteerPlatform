const mbxGeoCoding = require('@mapbox/mapbox-sdk/services/geocoding');
const geoCoder = mbxGeoCoding({ accessToken: process.env.MAPBOX_TOKEN });

const getCoordinates = async (location) => {
    const response = await geoCoder.forwardGeocode({ query: location, limit: 1 }).send();
    if (!response.body.features.length) {
        throw new Error('Location not found');
    }
    return response.body.features[0].center; 
};

module.exports = { getCoordinates };