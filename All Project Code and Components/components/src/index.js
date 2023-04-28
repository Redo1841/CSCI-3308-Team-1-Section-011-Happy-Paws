// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const process = require('process');
const express = require('express'); // To build an application server or API
const app = express();
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcrypt'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part B.
require('dotenv').config(); //include .env

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

app.set('view engine', 'ejs'); // set the view engine to EJS
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

// TODO - Include your API routes here
// Authentication Middleware.
const auth = (req, res, next) => {
  if (req.session.user || req.path === '/login' || req.path === '/register') {
    return next();
  }
  else {
    return res.redirect('/login');
  }
};

// Authentication Required
app.use(auth);

app.get('/', (req, res) => {
  // TODO: Add search functionality
  res.redirect('/discover');
});

app.get('/welcome', (req, res) => {
  res.json({ status: 'success', message: 'Welcome!' });
});

app.get('/discover', async (req, res) => {

  const axiosConfig = {
    baseURL: 'https://api.petfinder.com/v2/',
    headers: {
      Authorization: `Bearer ${process.env.PETFINDER_API_KEY}`
    },
    params: {
      limit: 100,
      type: "Dog",

    }

  };

  const finderRes = await axios.get('/animals', axiosConfig);

  let petfinder = {};
  petfinder.animals =  finderRes.data.animals.filter((animal) => animal.photos.length > 0).slice(0, 20);
  console.log(petfinder.animals)
  console.log(petfinder.animals[0].photos)
  return res.render('pages/discover', { petfinder });

});

app.get('/register', (req, res) => {
  res.render('pages/register', {})
});

app.get('/login', (req, res) => {
  res.render('pages/login', {});
});

app.get('/favorite', async (req, res) => {
  //TODO: Add favorites
  try {
    const query = `SELECT animal_id FROM favorites where user_id = $1`;

    const favs = await db.any(query, [req.session.user.user_id]);

    let info = favs.map(async (fave)=>{
      const axiosConfig = {
        baseURL: 'https://api.petfinder.com/v2/',
        headers: {
          Authorization: `Bearer ${process.env.PETFINDER_API_KEY}`
        },
        params: {
          limit: 1
        }
      };
      return await axios.get('/animals'+favs, axiosConfig);
    });
    res.render('pages/favorite', { favorites: info });
  }
  catch (err) {
    console.error(err);
    return res.redirect('/discover');
  }
});

app.post('/register', async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10);

    const query = `INSERT INTO users(email, password, first_name, last_name, location) VALUES ($1, $2, $3, $4, $5);`;

    await db.none(query, [req.body.email, hash, req.body.first_name, req.body.last_name, req.body.location]);


    return res.redirect('/login');
  } catch (err) {
    console.error(err);
    return res.redirect('/register');
  }
});

app.post('/login', async (req, res) => {
  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    const user = await db.one(query, [req.body.email]);
    const match = await bcrypt.compare(req.body.password, user.password);
    if (match) {
      req.session.user = user;
      req.session.save();
      return res.redirect('/discover');
    }
    return res.redirect('/login');
  } catch (err) {
    console.error(err);
    return res.redirect('/login');
  }
});

app.post('/favorite', async (req, res) => {
  try {
    const query = 'INSERT INTO favorites(user_id, animal_id) VALUES ($1, $2);';

    await db.none(query, [req.session.user.user_id, req.body.animal_id]);
    console.log(req.body.animal_id);
    return res.redirect('/discover');
    return res.sendStatus(200);
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
});


// PROFILE PAGE API 

app.get('/profile', async (req, res) => {
  
  try {
    const query = `SELECT * FROM users where user_id = $1`;
  
    const user = await db.one(query, [req.session.user.user_id]);
    res.render('pages/profile', { users: user });
  }
  catch (err) {
    console.error(err);
    return res.redirect('/discover');
  }
});


app.post('/profile', async (req, res) => {
  
  try{

    let email = req.session.user.email;
    let hash = req.session.user.password;
    let first_name = req.session.user.first_name;
    let last_name = req.session.user.last_name;
    let location = req.session.user.location;
    
    console.log(email);
    console.log(hash);
    console.log(first_name);
    console.log(last_name);
    console.log(location);
    if(req.body.email)
    {
      email = req.body.email;
    }
    if(req.body.password)
    {
      hash = await bcrypt.hash(req.body.password, 10);
    }
    if(req.body.first_name)
    {
      first_name = req.body.first_name;
    }
    if(req.body.last_name)
    {
      last_name = req.body.last_name;
    }
    if(req.body.location == "Choose Your State:")
    {
      location = req.body.location;
    }

    const query =
      `update users set email = $1, password = $2, first_name = $3, last_name = $4, location = $5 where user_id = ${req.session.user.user_id} returning *;`;
    //last_name = 4$, location = 5 , last_name, location$
    await db.one(query, [email, hash, first_name, last_name, req.body.location]);
    return res.redirect('/profile');
  }
  catch (err) {
    console.error(err);
    return res.redirect('/discover');
  }
    
});

app.delete('/favorite', async (req, res) => {
  try {
    const query = 'DELETE FROM favorites WHERE user_id = $1, animal_id = $2;';

    await db.none(query, [req.session.user.user_id, req.body.animal_id]);
    return res.redirect('/favorites');
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
});


const tokenRefresh = async () => {
  const res = await axios.post('https://api.petfinder.com/v2/oauth2/token',
    {
      grant_type: 'client_credentials',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET
    }
  );
  process.env.PETFINDER_API_KEY = res.data.access_token;
  setTimeout(tokenRefresh, 3580 * 1000); // Almost an hour
};
tokenRefresh();




// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');