require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs=require('ejs');
const mongoose = require('mongoose');
//normal encrypt
// const encrypt = require('mongoose-encryption')
//level2
// const md5=require('md5');
//level 3
// const bcrypt = require('bcrypt');
// const saltRounds=10; 

//using passportjs to add cookies and session
const session=require('express-session');
const passport=require('passport');
const passportLocalMongoose=require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require('mongoose-findOrCreate');

const app=express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true}));

app.use(express.static("public"));


// level 4   
app.use(session({
    secret:"Thisisourlittlesecret.", 
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());

app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

// level 2 encryption
// userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields: ["password"] });

//continuing passport hashing
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User= new mongoose.model('User',userSchema);

//passport hashing continues level 5
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
  
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
 
app.get("/", (req, res) => {
    res.render('home');
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] })
);

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login", (req, res) => {
    res.render('login');
}); 


app.get("/register", (req, res) => {
    res.render('register');
});

app.get("/secrets", (req, res) => {
    User.find({"secret":{$ne:null}}, function (err, foundUser) {
    if(err){console.log(err)}
    else{
        res.render("secrets",{userWithSecrets:foundUser});
    }
    });
}); 

app.get("/submit", (req, res) => {
    if(req.isAuthenticated()){
        res.render('submit');
    }
    else{
        res.redirect("/login");
    }
});

app.post("/submit", (req, res) => {
    const submittedSecret=req.body.secret;

    console.log(req.user.id);

    User.findById(req.user.id,function(err, foundUser){
        if(err){console.log(err)}
        else{
            if(foundUser){
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }
    });
});

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
});

app.post("/register", (req, res) => {
    User.register({username: req.body.username},req.body.password,function(err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req, res,function(){
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login", (req, res) => {
    const user= new User({
        username: req.body.username,
        password: req.body.password 
    });

    req.login(user,function(err){
        if(err){console.log(err);}
        else{
            passport.authenticate("local")(req, res,function(){
                res.redirect("/secrets");
            })
        }
    });
});


//***For Level 3*//////

// app.post("/register", (req, res) => {

//     bcrypt.hash(req.body.password,saltRounds,function(err,hash){

//         const newUser = new User({
//             email: req.body.username,
//             //level 3: password: md5(req.body.password)  hashing of password
//             //level 4:
//             password:hash
//         });
    
//         newUser.save(function (err){
//             if(err) {console.log(err);}
//             else{
//                 res.render('secrets');
//             }
//         });
//     });

    
// });

// app.post("/login", (req, res) => {
//     const username = req.body.username;
//     // const password = md5(req.body.password);
//     const password = req.body.password;


//     User.findOne({email:username},function (err, foundUser){
//         if(err) {console.log(err);}
//         else{
//             if(foundUser){
//                 bcrypt.compare(password,foundUser.password,function(err,result){
//                     if(result===true){
//                         res.render('secrets');
//                     }
//                 });
//             }
//         }
//     });
// });

app.listen(3000,function(){
    console.log("Server started on Server 3000");
});