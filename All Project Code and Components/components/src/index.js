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
const validator = require('validator');
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
  petfinder.animals = finderRes.data.animals.filter((animal) => animal.photos.length > 0).slice(0, 20);
  return res.render('pages/discover', { petfinder });

});

app.get('/register', (req, res) => {
  res.render('pages/register', {})
});

app.get('/login', (req, res) => {
  res.render('pages/login', {});
});

app.get('/dog/:animalId', async (req, res) => {
  const axiosConfig = {
    baseURL: 'https://api.petfinder.com/v2/',
    headers: {
      Authorization: `Bearer ${process.env.PETFINDER_API_KEY}`
    },
  };

  const finderRes = await axios.get(`/animals/${req.params.animalId}`, axiosConfig);
  console.log(finderRes.data);
  res.render('pages/dogprofile', { dogData: finderRes.data });
});

app.get('/favorite', async (req, res) => {
  try {
    const query = `SELECT animal_id FROM favorites where user_id = $1`;
    const favs = await db.any(query, [req.session.user.user_id]);
    let ids = favs.map(obj => obj.animal_id);
    const axiosConfig = {
      baseURL: 'https://api.petfinder.com/v2/',
      headers: {
        Authorization: `Bearer ${process.env.PETFINDER_API_KEY}`
      },
      params: {
        limit: 1
      }
    };
    let petfinder = {};
    petfinder.animals = await Promise.all(ids.map(async (fave, i) => {
      const response = await axios.get(`/animals/${fave}`, axiosConfig);
      const animal = response.data.animal;
      if (animal && animal.photos.length > 0) {
        return animal;
      }
    }));
    petfinder.animals = petfinder.animals.filter((animal) => animal).slice(0, 20);

    res.render('pages/favorite', { petfinder });
  } catch (err) {
    console.error(err);
    return res.redirect('/discover');
  }
});


app.post('/register', async (req, res) => {
  try {
    if (!validator.isEmail(req.body.email)) {
      throw new Error('Invalid Email');
    }
    if (40 > validator.isStrongPassword(req.body.password, {
      returnScore: true
    })) {
      throw new Error('Weak Password');
    }
    const hash = await bcrypt.hash(req.body.password, 10);

    const query = `INSERT INTO users(email, password, first_name, last_name, location) VALUES ($1, $2, $3, $4, $5);`;

    await db.none(query, [req.body.email, hash, req.body.first_name, req.body.last_name, req.body.location]);


    return res.redirect('/login');
  } catch (err) {
    console.error(err);
    return res.redirect('/register', { error: err.messsage});
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
    return res.redirect('/discover');
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

app.post('/profile/email', async (req, res) => {
  if (req.body.email) {
    try {
      const query = `update users set email = $1 where user_id = ${req.session.user.user_id} returning *;`;

      await db.one(query, [req.body.email]); //need await to update the query before trying to rerender the profile page
      return res.redirect('/profile');

    }
    catch (err) {
      console.error(err);
      return res.redirect('/discover');
    }

  }
  else {
    console.error("No Email provided")
  }
  res.redirect('/profile');
});

app.post('/profile/password', async (req, res) => {
  if (req.body.password) {
    try {
      const hash = await bcrypt.hash(req.body.password, 10);
      const query = `update users set password = $1 where user_id = ${req.session.user.user_id} returning *;`;

      await db.one(query, [hash]);
      return res.redirect('/profile');

    }
    catch (err) {
      console.error(err);
      return res.redirect('/discover');
    }

  }
  else {
    console.error("No password provided")
  }
  res.redirect('/profile');
});

app.post('/profile/first_name', async (req, res) => {
  if (req.body.first_name) {
    try {
      const query = `update users set first_name = $1 where user_id = ${req.session.user.user_id} returning *;`;

      await db.one(query, [req.body.first_name]); //need await to update the query before trying to rerender the profile page
      return res.redirect('/profile');

    }
    catch (err) {
      console.error(err);
      return res.redirect('/discover');
    }

  }
  else {
    console.error("No First Name provided")
  }
  res.redirect('/profile');
});
app.post('/profile/last_name', async (req, res) => {
  if (req.body.last_name) {
    try {
      const query = `update users set last_name = $1 where user_id = ${req.session.user.user_id} returning *;`;

      await db.one(query, [req.body.last_name]); //need await to update the query before trying to rerender the profile page
      return res.redirect('/profile');

    }
    catch (err) {
      console.error(err);
      return res.redirect('/discover');
    }

  }
  else {
    console.error("No Last Name provided")
  }
  res.redirect('/profile');
});

app.post('/profile/location', async (req, res) => {
  if (req.body.location) {
    try {
      const query = `update users set location = $1 where user_id = ${req.session.user.user_id} returning *;`;

      await db.one(query, [req.body.location]); //need await to update the query before trying to rerender the profile page
      return res.redirect('/profile');

    }
    catch (err) {
      console.error(err);
      return res.redirect('/discover');
    }

  }
  else {
    console.error("No Location provided")
  }
  res.redirect('/profile');
});

app.post('/unfavorite', async (req, res) => {
  try {
    const query = 'DELETE FROM favorites WHERE user_id = $1 AND animal_id = $2;';
    console.log(req.session.user.user_id);
    console.log(req.params.animal_id);
    await db.none(query, [req.session.user.user_id, req.body.animal_id]);
    return res.redirect('/favorite');
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

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.render('pages/logout');
});


// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');