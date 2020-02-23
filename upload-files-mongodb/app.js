const express = require('express');
const bodyParser = require("body-parser");
const path = require("path");
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const GridFs = require('gridfs-stream');
const methodOverride = require('method-override');
const authRouter = require('./users/users.controller');
const session = require('express-session');

const app = express();
//Use Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

app.use(session({ secret: 'password', cookie: { maxAge: 60000 }}))
//Mongo URI
const mongoURI = "mongodb://localhost:27017/mydb";
//Create Mongo Connection
const conn = mongoose.createConnection(mongoURI);

//Init Mongo Gridfs
let gfs;
conn.once('open', () => {
    //Init Stream
    gfs = GridFs(conn.db, mongoose.mongo);
    gfs.collection('uploads')
})

//create storage engine 
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
          //generate name with 16 chars
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          //filename with extension will be added in DB
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
    }
  });
  const upload = multer({ storage });

app.use('/public', express.static(path.join(__dirname, '/public')))


//---------ROUTES---------

//@route GET home page
app.use('/auth',authRouter);
app.get(['/', '/home', 'index'], (req,res) => {
    //res.render('index');
    console.log("session(home) : ", req.session);
    
    gfs.files.find().toArray((err,files) => {
        // check if files
        if(!files || files.length === 0) {
            res.render('index',{files:false});
        } else {
            files.map(file => {
                if(file.contentType === 'image/jpeg' || file.contentType == 'image/png') {
                    file.isImage = true;
                } else if(file.contentType === 'video/mp4') {
                    file.isVideo = true;
                }
            });
            res.render('index',{files:files})
        }
    });
});

//@route GET map page
app.get('/map', (req,res) => {
    //res.render('index');
    gfs.files.find().toArray((err,files) => {
        res.render('map',{files:files})
    });
});

//@route GET post page
app.get('/post', (req,res) => {
    //res.render('index');
    gfs.files.find().toArray((err,files) => {
        res.render('post', {files:files});
    });
});

//@route GET log in page
app.get('/logIn', (req,res) => {
    res.render('logIn')
});

// @route POST /upload uplaods file to db
app.post('/upload', upload.single('file'),(req,res) => {
    //res.json({file: req.file});
    res.redirect('/');
});

// @route GET /files display all Files in JSON
app.get('/files/', (req,res) => {
    gfs.files.find().toArray((err,files) => {
        // check if files?
        if(!files || files.length === 0) {
            return res.status(404).json({
                err: 'No files exists'
            });
        }
        //Files exists
        return res.json(files);
    });
});

// @route GET /files/:filename display all Files in JSON
app.get('/files/:filename', (req,res) => {
    gfs.files.findOne({filename: req.params.filename}, (err,file) => {
        if(!file || file.length === 0) {
            return res.status(404).json({
                err: 'No file exists'
            });
        }
        //File exists
        return res.json(file);
    })
});

// @route GET /image/:filename display image
app.get('/image/:filename', (req,res) => {
    gfs.files.findOne({filename: req.params.filename}, (err,file) => {
        if(!file || file.length === 0) {
            return res.status(404).json({
                err: 'No file exists'
            });
        }
        //check if image
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
            //Read output to browser
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        } else {
            res.status(404).json({
                err: 'Not an image'
            })
        }
    })
});

// @route GET /video/:filename display Video
app.get('/video/:filename', (req,res) => {
    gfs.files.findOne({filename: req.params.filename}, (err,file) => {
        if(!file || file.length === 0) {
            return res.status(404).json({
                err: 'No file exists'
            });
        }
        //check if video
        if(file.contentType === 'video/mp4') {
            
            if (req.headers['range']) {
                var parts = req.headers['range'].replace(/bytes=/, "").split("-");
                var partialstart = parts[0];
                var partialend = parts[1];
    
                var start = parseInt(partialstart, 10);
                var end = partialend ? parseInt(partialend, 10) : file.length - 1;
                var chunksize = (end - start) + 1;
    
                res.writeHead(206, {
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Range': 'bytes ' + start + '-' + end + '/' + file.length,
                    'Content-Type': file.contentType
                });
    
                gfs.createReadStream({
                    _id: file._id,
                    range: {
                        startPos: start,
                        endPos: end
                    }
                }).pipe(res);
            } else {
                res.header('Content-Length', file.length);
                res.header('Content-Type', file.contentType);
    
                gfs.createReadStream({
                    _id: file._id
                }).pipe(res);
            }
        } else {
            res.status(404).json({
                err: 'Not an video'
            })
        }
    })
});

//@route Delete /files/:id delete file
app.delete('/files/:id', (req,res) => {
    gfs.remove({_id : req.params.id, root:'uploads'}, (err,gridStore) => {
        if(err) {
            return res.status(404).json({err: err});
        } 
        res.redirect('/')
    })
})

const port = 3000;

app.listen(port,() => console.log(`server started on port ${port}`))