class Server {

  constructor(options) {
    this.base_url = options.base_url || '';
  }

  getPuzzle(id: string) {
    var url = this.base_url + '/puzzle/' + id;
    var request = new Request(url);
    return fetch(request).then(function(response) {
      return response.arrayBuffer()
    });
  }

  uploadPuzzle(data: File) {
    var url = this.base_url + '/puzzle/';
    var request = new Request(url);
    var formData = new FormData();
    formData.append('file', data, 'file.puz');
    return fetch(request, {
      method: 'POST',
      body: formData
    }).then(function(response) {
      return response.json()
    });
  }

  startSolution(puzzleId: string) {
    var url = this.base_url + '/solution/';
    var postdata = {
      PuzzleId: puzzleId
    }
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify(postdata)
    }).then(function(response) {
      return response.json()
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
