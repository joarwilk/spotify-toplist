const request = require('request-promise');
const storage = require('node-persist');

module.exports = (url, callback) => {
	storage.getItem(url, (res) => {
		if (false) {
			callback(res);
		} else {
			request(url, (err, res, body) => {
				if (err) {
					return;
				}

				const parsedBody = JSON.parse(body);

				storage.setItem(url, parsedBody);

				callback(parsedBody);
			});
		}
	})
}