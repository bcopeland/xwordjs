class Server {

  constructor(options) {
    this.base_url = options.base_url || 'http://localhost:4000';
    this.ws = null;
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

  sendSolution(id: string, version: int, fill: string) {
    if (!this.ws)
      return;
    var msg = {
      Id: id,
      Version: version,
      Grid: fill
    }
    var ws = this.ws;
    if (ws.readyState === WebSocket.CONNECTING) {
        ws.addEventListener('open', function (event) {
        ws.send(JSON.stringify(msg));
      });
    } else if (ws.readyState == WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  connect(id: string, updateSolution: (msg:string) => void) {
    this.ws = new WebSocket(this.base_url.replace("http", "ws") + "/ws");
    this.ws.addEventListener('message', function (e) {
      var msg = JSON.parse(e.data);
      updateSolution(msg);
    });
  }
}

export default Server
