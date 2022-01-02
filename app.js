const express = require('express')
require('dotenv').config()
const app = express()
const port = 3000
const AWS = require("aws-sdk");
const {gzip, ungzip} = require('node-gzip');
const fs = require('fs');
const timer = ms => new Promise(res => setTimeout(res, ms))
const cron = require('node-cron');
const axios = require('axios');

const connection = require('./config/db.config.js')
const Stock = require('./models/stock.js')
const Type = require('./models/type.js')
const testType = require('./models/testType.js')
const s3 = new AWS.S3({
  region: "us-east-1",
  endpoint: "us-east-1.linodeobjects.com",
  apiVersion: "2006-03-01",
  credentials: new AWS.Credentials({
    accessKeyId: process.env.s3_user,
    secretAccessKey: process.env.s3_pass
  })
});

// const { auth } = require('express-openid-connect');

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.auth0_secret,
  baseURL: process.env.url,
  clientID: process.env.auth0_client_id,
  issuerBaseURL: process.env.auth0_base
};

connection.once('open', () => console.log('DB Connected'))
connection.on('error', () => console.log('Error with DB'))

// auth router attaches /login, /logout, and /callback routes to the baseURL
// app.use(auth(config));

app.get('/', function(req, res, next) {
  Stock.find({}).sort({store: 1, testType: 1}).exec(function(err, s) {
    Type.find({}).sort({name: 1}).exec(function(err, t) {
      testType.find({}).sort({name: 1}).exec(function(err, tt) {
        res.render('index', { stock: s, type: t, tt: tt });
      });
    });
  });
});

app.get('/stock/edit', function(req, res, next) {
  Stock.findOne({ _id: req.query.id }).exec(function(err, s) {
    res.render('modify', { stock: s });
  });
});

app.get('/stock/modify/link', function(req, res, next) {
  Stock.findOne({ _id: req.query.id }).exec(function(err, s) {
    res.render('link', { stock: s });
  });
});

app.get('/stock/modify/count', function(req, res, next) {
  Stock.findOne({ _id: req.query.id }).exec(function(err, s) {
    res.render('count', { stock: s });
  });
});

app.get('/stock/modify/price', function(req, res, next) {
  Stock.findOne({ _id: req.query.id }).exec(function(err, s) {
    res.render('price', { stock: s });
  });
});

app.get('/stock/modify/type', function(req, res, next) {
  Stock.findOne({ _id: req.query.id }).exec(function(err, s) {
    Type.find({}).sort({name: 1}).exec(function(err, t) {
      res.render('type', { stock: s, type: t });
    });
  });
});

app.get('/stock/modify/testType', function(req, res, next) {
  Stock.findOne({ _id: req.query.id }).exec(function(err, s) {
    testType.find({}).sort({name: 1}).exec(function(err, t) {
      res.render('testType', { stock: s, type: t });
    });
  });
});
async function json(){
  var JSONExport = []
  Stock.find({}).sort({ isInStock: 1, pricePer: 1, lastUpdated: -1, testType: 1, store: 1 }).exec(function(err, s) {
    for(var i = 0; i < s.length; i++){
      JSONExport.push({
        "type": s[i].testType,
        "store": s[i].store,
        "stock": s[i].isInStock,
        "link": s[i].purchaseLink,
        "updateTime": s[i].lastUpdated,
        "price": s[i].pricePer,
        "count": s[i].count,
        "testType": s[i].type
      })
    }
    var jsonE = JSON.stringify(JSONExport);
    console.log(JSONExport)
    fs.writeFile('./export.json', JSON.stringify(JSONExport), err => {
      if (err) {
          console.log('Error writing file', err)
      } else {
          console.log('Successfully wrote file')
          var uploadParams = {Bucket: 'covid-test-api', Key: '', Body: '', ACL: 'public-read', ContentType: 'application/json'};
          var file = './export.json';

          // Configure the file stream and obtain the upload parameters
          var fileStream = fs.createReadStream(file);
          fileStream.on('error', function(err1) {
            console.log('File Error', err1);
          });
          uploadParams.Body = fileStream;
          var path = require('path');
          uploadParams.Key = path.basename(file);
          // call S3 to retrieve upload file to specified bucket
          s3.upload (uploadParams, function (data) {
            if (data) {
              console.log("Upload Success", data.Location);
            }
          });
      }
    })
  });
}

async function cronEmail(){
  await axios.get('https://tickets.ilvaccine.org/system/cron/5127d95dcc0137b58973751aa8644b6f')
  console.log('cron done')
}
if(!process.env.dev){
  cron.schedule('* * * * *', () => {
    json();
    cronEmail();
  })
}

app.use(express.json()) //parse incoming request body in JSON format.
app.use('/api/stock', require('./api/stock/edit'))
app.use('/api/stock', require('./api/stock/remove'))
app.use('/api/type', require('./api/type/create'))
app.use('/api/type', require('./api/type/delete'))
app.use('/api/testType', require('./api/testType/create'))
app.use('/api/testType', require('./api/testType/delete'))

app.listen(port, () => {
  console.log('App listening at ' + process.env.url)
})
app.set('view engine', 'ejs')