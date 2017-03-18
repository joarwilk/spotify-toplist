const request = require('./request');
const storage = require('node-persist');
const search = require('./finder');
const async = require('async');
const Promise = require('promise');
const Memcached = require('memcached');
const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId : '4b9b2e8899d44622a860e10de8119c53',
  clientSecret : '2b253d1c0dfe4656872c061c5a7a2166',
  redirectUri : 'http://localhost:3000'
});

const memcachedAddr = process.env.MEMCACHE_PORT_11211_TCP_ADDR || 'localhost';
const memcachedPort = process.env.MEMCACHE_PORT_11211_TCP_PORT || '11211';
const memcached = new Memcached(memcachedAddr + ':' + memcachedPort);

const BASE_LASTFM_PATH = 'http://ws.audioscrobbler.com/2.0/?method=user.getTopTracks&limit=25' + 
						 '&period=7day&format=json&api_key=ea2dec6d2dbdb2faa27b282ff5997d96&user=';

const PLAYLIST_OPTIONS = {
	public: false,
};

const range = (n) => (
	Array.apply(null, { length: n }).map(Number.call, Number)
);

const save = (playlist) => {

}

const parse = (data) => {
	// Return right away if its already parsed
	if (data.id) {
		return data;
	}

	return {
		id: data.body.id,
		rev: data.body.snapshot_id,
		length: data.body.tracks.items.length
	}
};

const getPlaylist = (username, id) => {
	return new Promise((resolve, reject) => {
		spotifyApi.getPlaylist(username, id)
			.then((data) => {
				console.log('Got playlist information');

				resolve(data);
			}, (err) => {
				console.log('Creating new playlist for this user');
				spotifyApi.createPlaylist(username, 'Most Played - Past month', PLAYLIST_OPTIONS)
					.then((data) => {
						resolve(data);
					}, (err) => {
						console.log(err);
					});
			})
	});
};


storage.init({
    dir:'storage',
    logging: false, 
}, () => {
	storage.getItem('users').then((users) => {
		if (!users) {
			return;
		}

		const actions = Object.keys(users).map((username) => (callback) => {
			const user = users[username];

			console.log('running', username);

			spotifyApi.setAccessToken(user.access_token);
			spotifyApi.setRefreshToken(user.refresh_token);

			request(BASE_LASTFM_PATH + user.lastfmUser, (data) => {
				console.log('Got lastfm data');
				search(data.toptracks.track, (tracks) => {
					const trackIds = tracks.map((track) => (track || {}).uri).filter(Boolean);

					console.log('Search finished');

					getPlaylist(username, user.playlistId)
						.then(parse)
						.then(playlist => {
							if (playlist.length > 0) {
								console.log('Removing old tracks');

								return new Promise((resolve, reject) => {
									spotifyApi.removeTracksFromPlaylistByPosition(
										username, playlist.id, range(playlist.length), playlist.rev
									).then(() => resolve(playlist))
									 .catch(err => reject(err));
								});
							} else {
								return playlist;
							}
						})
						.then(parse)
						.then(playlist => {
							console.log('Adding tracks');
							return new Promise((resolve, reject) => {
								spotifyApi.addTracksToPlaylist(username, playlist.id, trackIds)
									.then(() => resolve(playlist))
									.catch(err => reject(err));
							});
						})
						.then(parse)
						.catch(err => {
							console.error('error', err);
						})
						.done(playlist => {
							console.log('Done');
							user.playlistId = playlist.id;

							callback();
						})
				});
			});
		});

		async.waterfall(actions, () => {
			console.log('Updating users');
			storage.setItem('users', users);
		})
	}, (err) => {
		console.error('error', err)
	})
});


