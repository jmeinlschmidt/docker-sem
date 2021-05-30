// Imports
// ===================================================================
var express = require('express');
var http = require('http');
var memStat = require('mem-stat');
var { Docker } = require('node-docker-api');
var bodyParser = require('body-parser');

// Connecting to the Docker API socket
var dockerSocket = '/var/run/docker.sock';
var docker = new Docker({ socketPath: dockerSocket });

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configuration
// ===================================================================
var config = {
  baseUrl: '/api',
  port: 8080,
  hash: '48bb8'
}

// Returns current time for console logging
function consoleTime() {
  d = new Date();

  //Color pattern
  colorize = '\x1b[33m%s\x1b[0m';

  return colorize.replace('%s', d.toLocaleTimeString() + '.' + d.getMilliseconds());
}

// Routing
// ===================================================================

// Routing - API
// ===================================================================

// Handle API requests from the application

app.get(config.baseUrl + '/info', function(req, res) {
  remoteIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  console.log('\n');
  console.log('==============================================================');
  console.log(consoleTime(), 'Incoming request \x1b[35m\'GET /api/info/\'\x1b[0m from \x1b[36m' + remoteIp + '\x1b[0m');

  getInfo()
    .then(data => {
      console.log(consoleTime(), 'Sending response \x1b[32m\'' + JSON.stringify(data) + '\'\x1b[0m to \x1b[36m' + remoteIp + '\x1b[0m');

      res.send(data);

      console.log('==============================================================');
    });
});

app.post(config.baseUrl + '/container', function(req, res) {
  remoteIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  console.log('\n');
  console.log('==============================================================');
  console.log(consoleTime(), 'Incoming request \x1b[35m\'POST /container/' + '\'\x1b[0m from \x1b[36m' + remoteIp + '\x1b[0m');
  console.log(req.body);
  console.log(consoleTime(), 'Attempt to run a new container of image \x1b[35m\'' + req.body.image + '\'\x1b[0m on machine \x1b[36m#' + config.hash + '\x1b[0m');

  // Run a new container on specified machine promise
  runContainer(req.body)
    .then(data => {
      // Console loggin
      console.log(consoleTime(), 'Sending response \x1b[32m\'' + JSON.stringify(data) + '\'\x1b[0m to \x1b[36m' + remoteIp + '\x1b[0m');

      // Sending a response back to the daemon
      res.send(data);

      console.log('==============================================================');
    })
    .catch(error => console.log('=============================================================='));
});

app.delete(config.baseUrl + '/container/:containerHash', function(req, res) {
  remoteIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  console.log('\n');
  console.log('==============================================================');
  console.log(consoleTime(), 'Incoming request \x1b[35m\'DELETE /container/' + req.params.containerHash + '\'\x1b[0m from \x1b[36m' + remoteIp + '\x1b[0m');
  console.log(consoleTime(), 'Attempt to kill container \x1b[35m\'' + req.params.containerHash + '\'\x1b[0m on machine \x1b[36m#' + config.hash + '\x1b[0m');

  // Kill the specified container
  killContainer(req.params.containerHash)
    .then(data => {
      // Console loggin
      console.log(consoleTime(), 'Sending response \x1b[32m\'' + JSON.stringify(data) + '\'\x1b[0m to \x1b[36m' + remoteIp + '\x1b[0m');

      // Sending a response back to the daemon
      res.send(data);

      console.log('==============================================================');
    })
    .catch(error => console.log('=erwer============================================================='));
});

// Server run
// ===================================================================
app.listen(config.port, function() {
  console.log(consoleTime(), 'Running DockerControl WORKER server at port \x1b[36m' + config.port + '\x1b[0m');
});

// Machine functions
// ===================================================================

// Get stats and containers and container's stats
function getInfo() {
  return new Promise((resolve, reject) => {
    console.log(consoleTime(), 'Sending request \x1b[35mcontainers\x1b[0m to Docker API at \x1b[36m' + dockerSocket + '\x1b[0m');

    result = {
      'stats': {},
      'containers': []
    };

    containersPromise = new Promise((resolve, reject) => {
      // List of containers promise
      containersListPromise = docker.container.list();
      
      // After the containersListPromise si resolved
      containersListPromise.then(containers => {
        containersResult = [];

        if(containers.length === 0) resolve([]);

        // For each container
        containers.forEach(function(container, i) {
          // Container status promise
          containerStatusPromise = container.status();
          
          // Container status stats promise after container status promise is resolved
          containerStatusStatsPromise = containerStatusPromise.then(status => status.stats());
          
          // After the container status stats promise is resolved
          containerStatusStatsPromise.then(stats => {

            // Get stats stream
            stats.on('data', stat => {
              stat = JSON.parse(stat);

              containerInfo = {
                hash: container.data.Id,
                name: container.data.Names[0].slice(1),
                image: container.data.Image,
                stats: {
                  ramLimit: stat.memory_stats.limit,
                  ramCurrent: stat.memory_stats.usage
                  //cpuCurrent: (stat.cpu_stats.cpu_usage.total_usage * 100 / stat.cpu_stats.system_cpu_usage).toFixed(2)
                },
                port: getContainerPublicPort(container.data.Ports),
                machine: config.hash
              }
                
              console.log(consoleTime(), 'Incoming response \x1b[32m\'' + JSON.stringify(containerInfo) + '\'\x1b[0m from Docker API at \x1b[36m' + dockerSocket + '\x1b[0m');
                
              // Destroying readable stream
              stats.destroy();
              
              // Push this container into containers result array
              containersResult.push(containerInfo);

              // If information about all containers is resolved, send signal to the main promise
              if (containersResult.length === containers.length) resolve(containersResult);
            });

            stats.on('error', err => console.log('Error: ', err));
          });
        });

      }).catch(err => reject(err));
    });

    memoryStatistic = memStat.allStats();

    result.stats = {
      'ramLimit': memoryStatistic.total,
      'ramCurrent': memoryStatistic.total - memoryStatistic.free
    }

    containersPromise.then(containersResult => {
      result.containers = containersResult;

      resolve(result);
    }).catch(err => console.log(err));
  });
}

function getContainerPublicPort(containerPorts) {
  resultPort = null;

  containerPorts.some(function(val, i) {
    if(val.PublicPort) {
      resultPort = val.PublicPort;
      return false;
    }
  });

  return resultPort;
}

// Container functions
// ===================================================================

// Run a new container
runContainer = containerCreateRequest => {
  // Run a new container promise
  return new Promise((resolve, reject) => {
    console.log(consoleTime(), 'Looking for free port...');

    getInfo()
      .then(data => {
        usedPorts = [];

        data.containers.forEach((container, i) => {
          usedPorts.push(container.port);
        });

        if(usedPorts.length === 0) {
          hostPort = 8081;
        }
        else {
          hostPort = Math.max(...usedPorts) + 1;
        }

        console.log(consoleTime(), 'Gained a free port \x1b[32m\'' + hostPort + '\'\x1b[0m');

        docker.container
          .create({
            Image: containerCreateRequest.image,
            Memory: containerCreateRequest.ramLimit,
            MemoryLimit: true,
            PortBindings: {
              '80/tcp': [
                {
                  'HostPort': hostPort.toString()
                }
              ]
            },
          })
          .then(container => container.start())
          .then(container => {
            console.log(consoleTime(), 'Successfuly running a new container \x1b[32m\'' + container.data.Id + '\'\x1b[0m on machine \x1b[36m#' + config.hash + '\x1b[0m');
            resolve({'status': true});
          })
          .catch(err => {
            console.log(err);
            reject({'status': false});
          });
      });
  }).catch(err => console.log(err));
}

// Kill and delete a container
function killContainer(containerHash) {
    // Run a new container promise
    return new Promise((resolve, reject) => {
      docker.container
        .get(containerHash)
        .status()
        .then(container => container.kill())
        .then(container => {
          console.log(consoleTime(), 'Successfuly killed container \x1b[32m\'' + container.data.Id + '\'\x1b[0m on machine \x1b[36m#' + config.hash + '\x1b[0m');
          
          container.delete()
            .then(() => {
              resolve({'status': true});
            })
        })
        .catch(err => {
          reject({'status': false});
        })
    });
}