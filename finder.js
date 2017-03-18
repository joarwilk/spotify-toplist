const storage = require('node-persist');
const request = require('request-promise');
const async = require('async');

const search = (tracks, callback) => {
	storage.getItem('api-links').then(function(trackCache) {
		const searches = [];

		if (!trackCache) {
			trackCache = {};
		}

		for (const track of tracks) {
			const q = `artist:${encodeURIComponent(track.artist.name)}%20track:${encodeURIComponent(track.name)}`;

			searches.push((cb) => {
				if (trackCache[q]) {
					cb(null, trackCache[q]);
				}
				else {
					request(`https://api.spotify.com/v1/search?q=${q}&type=track`).then((raw) => {
						const data = JSON.parse(raw);
						trackCache[q] = data.tracks.items[0];

						cb(null, data.tracks.items[0]);
					});
				}
			});
		}

		async.parallel(searches, (err, res) => {
			callback(res);

			storage.setItem('api-links', trackCache);
		})
	})

}

module.exports = search;