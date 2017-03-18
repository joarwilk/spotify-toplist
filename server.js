const http = require("http");
const url = require("url");
const storage = require('node-persist');
const SpotifyWebApi = require('spotify-web-api-node');

storage.init({
    dir:'storage',
    logging: true, 
});


const spotifyApi = new SpotifyWebApi({
  clientId : '4b9b2e8899d44622a860e10de8119c53',
  clientSecret : '2b253d1c0dfe4656872c061c5a7a2166',
  redirectUri : 'http://localhost:3000'
});

const scopes = ['playlist-modify-private', 'playlist-modify-public'],
    redirectUri = 'http://localhost:3000',
    clientId = '4b9b2e8899d44622a860e10de8119c53',
    state = 'kloarjoar';

var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

var server = http.createServer(function(req, res) {
	var parsedUrl = url.parse(req.url, true);
	if (parsedUrl.query.code) {
		spotifyApi.authorizationCodeGrant(parsedUrl.query.code)
		  .then(function(data) {
		    console.log('The token expires in ' + data.body['expires_in']);
		    console.log('The access token is ' + data.body['access_token']);
		    console.log('The refresh token is ' + data.body['refresh_token']);

		    // Set the access token on the API object to use it in later calls
		    spotifyApi.setAccessToken(data.body['access_token']);
		    spotifyApi.setRefreshToken(data.body['refresh_token']);

		    storage.getItem('users', (users) => {
		    	if (!users) {
		    		users = {};
		    	}

		    	data.body.lastfmUser = 'kloarjoar';

		    	if (!users['esset_']) {
		    		users['esset_'] = data.body;
		    	}

				storage.setItem('users', users);
		    })
		  }, function(err) {
		    console.log('Something went wrong!', err);
		  });
	}

	res.writeHead(200, {"Content-Type": "text/html"});
	res.write("<html>");
	res.write("<head>");
	res.write("<title>Hello World Page</title>");
	res.write("</head>");
	res.write("<body>");
	res.write("<a href='" + authorizeURL + "'>Logf in</a>");
	res.write("</body>");
	res.write("</html>");
	res.end();
}).listen(3000);