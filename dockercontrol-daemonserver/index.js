// Imports
// ===================================================================
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var { Docker } = require('node-docker-api');
var memStat = require('mem-stat');

// Connecting to the Docker API socket
var docker = new Docker({ socketPath: '/var/run/docker.sock' });

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configuration
// ===================================================================
var config = {
  baseUrl: '/api',
  port: 8080
}

// Register machines list
var machines = [
  {
    type: 'daemon',
    hash: 'uewyr',
    ip: '10.0.2.5',
    dockerControlPort: 8080,
    containers: [],
    stats: {},
    status: 'running'
  },
  {
    type: 'worker',
    hash: '48bb8',
    ip: '10.0.2.6',
    dockerControlPort: 8080,
    containers: [],
    stats: {},
    status: ''
  },
  {
    type: 'worker',
    hash: 'p8e87',
    ip: '10.0.2.7',
    dockerControlPort: 8080,
    containers: [],
    stats: {},
    status: ''
  },
  {
    type: 'worker',
    hash: 'nf0cc',
    ip: '10.0.2.8',
    dockerControlPort: 8080,
    containers: [],
    stats: {},
    status: ''
  }
];

// Returns current time for console logging
function consoleTime() {
  d = new Date();

  //Color pattern
  colorize = '\x1b[33m%s\x1b[0m';

  return colorize.replace('%s', d.toLocaleTimeString() + '.' + d.getMilliseconds());
}

// Routing
// ===================================================================

// Serve the Angular 5 application for Docker Control and Status check
app.use('/', express.static(__dirname + '/public'));

// Routing - API
// ===================================================================

// Handle API requests from the application

// Get status of all registered machines
app.get(config.baseUrl + '/machine', function(req, res) {
  remoteIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  console.log('\n');
  console.log('==============================================================');
  console.log(consoleTime(), 'Incoming request \x1b[35m\'GET /api/machine\'\x1b[0m from \x1b[36m' + remoteIp + '\x1b[0m');

  // Get all machines promise
  getMachines()
    .then(data => {
      console.log(consoleTime(), 'Sending response \x1b[32m\'' + JSON.stringify(data) + '\'\x1b[0m to \x1b[36m' + remoteIp + '\x1b[0m');
      res.send(data);
      console.log('==============================================================');
    })
    .catch(error => console.log('=============================================================='));
});

// Get status of certain machine by its hash
app.get(config.baseUrl + '/machine/:machineHash', function(req, res) {
  remoteIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  console.log('\n');
  console.log('==============================================================');
  console.log(consoleTime(), 'Incoming request \x1b[35m\'GET /api/machine/' + req.params.machineHash + '\'\x1b[0m from \x1b[36m' + remoteIp + '\x1b[0m');

  // Return machine object by hash (searches the machines list array)
  machine = getMachineByHash(req.params.machineHash);

  // Get single machine status promise
  getMachine(machine)
    .then(data => {
      console.log(consoleTime(), 'Sending response \x1b[32m\'' + data + '\'\x1b[0m to \x1b[36m' + remoteIp + '\x1b[0m');
      res.send(data);
      console.log('==============================================================');
    })
    .catch(error => console.log('=============================================================='));
});

// Run a container on specific machine
app.post(config.baseUrl + '/container', function(req, res) {
  remoteIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  console.log('\n');
  console.log('==============================================================');
  console.log(consoleTime(), 'Incoming request \x1b[35m\'POST /api/container/' + '\'\x1b[0m from \x1b[36m' + remoteIp + '\x1b[0m');
  console.log(req.body);

  // Run a new container on specified machine promise
  runContainer(req.body)
    .then(data => {
      console.log(consoleTime(), 'Sending response \x1b[32m\'' + data + '\'\x1b[0m to \x1b[36m' + remoteIp + '\x1b[0m');

      res.send(data);

      console.log('==============================================================');
    })
    .catch(error => console.log('errro=============================================================='));
});

// Kill and delete a container on specifi machine by hash
app.delete(config.baseUrl + '/container/:containerHash', function(req, res) {
  remoteIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  console.log('\n');
  console.log('==============================================================');
  console.log(consoleTime(), 'Incoming request \x1b[35m\'DELETE /api/container/' + req.params.containerHash + '\'\x1b[0m from \x1b[36m' + remoteIp + '\x1b[0m');

  // Kill the container on specified machine promise
  killContainer(req.params.containerHash)
    .then(data => {
      console.log(consoleTime(), 'Sending response \x1b[32m\'' + data + '\'\x1b[0m to \x1b[36m' + remoteIp + '\x1b[0m');

      res.send(data);

      console.log('==============================================================');
    })
    .catch(error => console.log('errro=============================================================='));
});

// Server run
// ===================================================================
app.listen(config.port, function() {
  console.log(consoleTime(), 'Running DockerControl DAEMON server at port \x1b[36m' + config.port + '\x1b[0m');
});

// Machine functions
// ===================================================================

// Return machine object by hash (searches the machines list array)
function getMachineByHash(machineHash) {
  var result;

  for (var i = 0, len = machines.length; i < len; i++ ) {
      if (machines[i]['hash'] === machineHash ) {
          result = machines[i];
          break;
      }
  }

  return result;
}

// Get single machine status promise
function getMachine(machine) {
  options = {
    host: machine.ip,
    path: '/api/info',
    port: machine.dockerControlPort,
    timeout: 1000
  };
  
  console.log(consoleTime(), 'Sending request \x1b[35m\'GET /api/info/\'\x1b[0m to DockerControl at \x1b[36m' + machine.ip + ':' + machine.dockerControlPort + '\x1b[0m');

  return new Promise((resolve, reject) => {
    http.get(options, res => {
      responseIp = res.headers['x-forwarded-for'] || res.connection.remoteAddress;

      body = [];

      res.on('data', data => {
        console.log(consoleTime(), 'Incoming response \x1b[32m\'' + data + '\'\x1b[0m from \x1b[36m' + responseIp + '\x1b[0m');
        body.push(data)
      });

      res.on('end', () => resolve(body.join('')));
    })
    .on('error', err => {
      if(err.code == 'EHOSTUNREACH') {
        console.log(consoleTime(), '\x1b[31m' + 'DockerControl at ' + machine.ip + ':' + machine.dockerControlPort + ' is unreachable\x1b[0m');
      } else {
        console.log(consoleTime(), '\x1b[31m' + 'Unkown error from ' + machine.ip + ':' + machine.dockerControlPort + '\x1b[0m');
      }

      reject(err);
    });
  });
}

// Get all machines status promise
function getMachines() {
  return new Promise((resolve, reject) => {
    // For each machine, it's needed to get containers and stats
    iterations = 0;
    machines.forEach((machine, i) => {
      if(machine['type'] !== 'daemon') {
        // Request Docker Control at specified machine for further information
        getMachine(machine)
          .then(machineInfo => {
            machines[i].containers = JSON.parse(machineInfo).containers;
            machines[i].stats = JSON.parse(machineInfo).stats;
            machines[i].status = 'running'
            iterations++;

            if(iterations == (machines.length - 1)) resolve(machines);
          })
          .catch(err => {
            machines[i].status = 'unreachable'
            iterations++;
            
            if(iterations == (machines.length - 1)) resolve(machines);
          });
      } else if(machine['type'] === 'daemon') {
        memoryStatistic = memStat.allStats();

        machines[i].stats = {
          'ramLimit': memoryStatistic.total,
          'ramCurrent': memoryStatistic.total - memoryStatistic.free
        }
      }
    });
  });
}

// Container functions
// ===================================================================

// Send a run request to specified machine
function runContainer(containerCreateRequest) {
  // Get desired machine
  containerMachine = getMachineByHash(containerCreateRequest.machine);

  options = {
    hostname: containerMachine.ip,
    path: '/api/container',
    port: containerMachine.dockerControlPort,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(containerCreateRequest))
    }
  };

  return new Promise((resolve, reject) => {
    // Console logging
    console.log(consoleTime(), 'Sending request \x1b[35m\'POST /api/container/\'\x1b[0m to DockerControl at \x1b[36m' + containerMachine.ip + ':' + containerMachine.dockerControlPort + '\x1b[0m');

    http.request(options, res => {
      responseIp = res.headers['x-forwarded-for'] || res.connection.remoteAddress;

      body = [];

      res.on('data', data => {  
        console.log(consoleTime(), 'Incoming response \x1b[32m\'' + data + '\'\x1b[0m from \x1b[36m' + responseIp + '\x1b[0m');

        body.push(data);

      });

      res.on('end', () => resolve(body.join('')));
    })
    .on('error', err => {
      if(err.code == 'EHOSTUNREACH') {
        console.log(consoleTime(), '\x1b[31m' + 'DockerControl at ' + containerMachine.ip + ':' + containerMachine.dockerControlPort + ' is unreachable\x1b[0m');
      } else {
        console.log(consoleTime(), '\x1b[31m' + 'Unkown error from ' + containerMachine.ip + ':' + containerMachine.dockerControlPort + '\x1b[0m');
      }

      reject(err);
    })
    .write(JSON.stringify(containerCreateRequest));
  });
}

// Kill a container on a specified machine
function killContainer(containerHash) {
  return new Promise((resolve, reject) => {
    getMachines()
      .then(machines => {
        machines.some((machine, i) => {
          machine.containers.some((container, i) => {
            if(container.hash == containerHash) {
              // Get desired machine
              ;
              containerMachine = getMachineByHash(container.machine);
              return false;
            }
          });
        });

        if(typeof containerMachine === "undefined") return reject('Container or machine not found');

        options = {
          hostname: containerMachine.ip,
          path: '/api/container/' + containerHash,
          port: containerMachine.dockerControlPort,
          method: 'DELETE'
        };
      
        // Console logging
        console.log(consoleTime(), 'Sending request \x1b[35m\'DELETE ' + options.path + '\'\x1b[0m to DockerControl at \x1b[36m' + containerMachine.ip + ':' + containerMachine.dockerControlPort + '\x1b[0m');

        http.request(options, res => {
          responseIp = res.headers['x-forwarded-for'] || res.connection.remoteAddress;

          body = [];

          res.on('data', data => {  
            console.log(consoleTime(), 'Incoming response \x1b[32m\'' + data + '\'\x1b[0m from \x1b[36m' + responseIp + '\x1b[0m');

            body.push(data);

          });

          res.on('end', () => resolve(body.join('')));
        })
        .on('error', err => {
          if(err.code == 'EHOSTUNREACH') {
            console.log(consoleTime(), '\x1b[31m' + 'DockerControl at ' + containerMachine.ip + ':' + containerMachine.dockerControlPort + ' is unreachable\x1b[0m');
          } else {
            console.log(consoleTime(), '\x1b[31m' + 'Unkown error from ' + containerMachine.ip + ':' + containerMachine.dockerControlPort + '\x1b[0m');
          }

          reject(err);
        })
        .end();
    }).catch(err => console.log(err));
  });
}