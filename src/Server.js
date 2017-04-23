class Server {

  constructor(options) {
    this.base_url = options.base_url || 'http://localhost:4000';
  }

  getPuzzle(id: string) {
    var url = this.base_url + '/puzzle/' + id;
    var request = new Request(url);
    return fetch(request).then(function(response) {
      return response.arrayBuffer()
    });
  }

  getSolution(id: string) {
    var url = this.base_url + '/solution/' + id;
    var request = new Request(url);
    return fetch(request).then(function(response) {
      return response.json()
    });
  }

  postSolution(id: string, version: int, fill: string) {
    var url = this.base_url + '/solution/' + id;
    var postdata = {
      Version: version,
      Grid: fill
    }
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify(postdata)
    }).then(function(response) {
      return response.json()
    });
  }
}

export default Server
