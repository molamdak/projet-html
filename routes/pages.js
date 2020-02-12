const express = require('express');
const User = require('../core/user');
const router = express.Router();
const path = require('path');

// create an object from the class User in the file core/user.js
const user = new User();

// Get the index page
router.get('/', (req, res, next) => {
    let user = req.session.user;
    // If there is a session named user that means the use is logged in. so we redirect him to home page by using /home route below
    if(user) {
        //res.redirect('/home');
        res.sendFile(path.join(__dirname+'/../views/home.html'));
        return;
    }
    // IF not we just send the index page.
    //res.render('index', {title:"My application"});
    res.sendFile(path.join(__dirname+'/../views/index.html'));

})

// Get home page
router.get('/home', (req, res, next) => {
    let user = req.session.user;

    if(user) {
        //res.render('home', {opp:req.session.opp, name:user.fullname});
        res.sendFile(path.join(__dirname+'/../views/home.html'));
        return;
    }
    res.redirect('/');
});

// Post login data
router.post('/login', (req, res, next) => {
    // The data sent from the user are stored in the req.body object.
    // call our login function and it will return the result(the user data).
    user.login(req.body.username, req.body.password, function(result) {
        if(result) {
            // Store the user data in a session.
            req.session.user = result;
            req.session.opp = 1;
            // redirect the user to the home page.
           // res.redirect('/home');
           res.sendFile(path.join(__dirname+'/../views/home.html'));
        }else {
            // if the login function returns null send this error message back to the user.
            res.send('Username/Password incorrect!');
        }
    })

});


// Post register data
router.post('/register', (req, res, next) => {
    // prepare an object containing all user inputs.
    let userInput = {
        username: req.body.username,
        fullname: req.body.fullname,
        password: req.body.password
    };
    // call create function. to create a new user. if there is no error this function will return it's id.
    user.create(userInput, function(lastId) {
        // if the creation of the user goes well we should get an integer (id of the inserted user)
        if(lastId) {
            // Get the user data by it's id. and store it in a session.
            user.find(lastId, function(result) {
                req.session.user = result;
                req.session.opp = 0;
                //res.redirect('/home');
                res.sendFile(path.join(__dirname+'/../views/home.html'));

            });

        }else {
            console.log('Error creating a new user ...');
        }
    });

});

router.post('/registration', (req, res, next) => {
    let user = req.session.user;
    // If there is a session named user that means the use is logged in. so we redirect him to home page by using /home route below
    if(user) {
        
        res.sendFile(path.join(__dirname+'/../views/home.html'));
        return;
    }else{
    // IF not we just send the index page.
 
    res.sendFile(path.join(__dirname+'/../views/registration.html'));

    }

})


// Get loggout page
router.post('/loggout', (req, res, next) => {
    // Check if the session is exist
    if(req.session.user) {
        // destroy the session and redirect the user to the index page.
        req.session.destroy(function() {
            res.sendFile(path.join(__dirname+'/../views/index.html'));
            //res.redirect('/');
        });
    }
});

module.exports = router;