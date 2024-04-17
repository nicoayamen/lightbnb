const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require("pg");

const pool = new Pool({
  user: "development",
  password: "development",
  host: "localhost",
  database: "lightbnb",
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool
  .query(`SELECT * FROM users WHERE email = $1`, [email.toLowerCase()])
  .then((result) => {
    return result.rows[0] || null;
  })
  .catch((err) => {
    console.error('Error executing getUserWithEmail:', err.message);
    throw err;
  });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool
    .query(`SELECT * FROM users WHERE id = $1`, [id])
    .then((result) => {
      return result.rows[0] || null;
    })
    .catch((err) => {
      console.error('Error executing getUserWithId:', err.message);
      throw err;
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const { name, email, password } = user;
  return pool
    .query(
      `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *`,
      [name, email.toLowerCase(), password]
    )
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.error('Error executing addUser:', err.message);
      throw err;
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  return pool
    .query(`
    SELECT reservations.*, properties.*, AVG(property_reviews.rating) as average_rating
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    LEFT JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
    GROUP BY reservations.id, properties.id
    LIMIT $2`, [guest_id, limit])
    .then((result) => {
      //return list of reservations by guest_id
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
      return null;
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = function (options, limit = 10) {
   //initialize array to hold parameters that may be avaiable to use in the query
   const queryParams = [];

   //set up query for all information that comes before WHERE clauses
   let queryString = `
   SELECT properties.*, AVG(property_reviews.rating) as average_rating
   FROM properties
   LEFT JOIN property_reviews ON properties.id = property_id
   `;
 
   //if city has been passed as a parameter, add WHERE clause for the city
   if (options.city) {
     queryParams.push(`%${options.city}%`);
     queryString += `WHERE city LIKE $${queryParams.length} `;
   }
 
   //if user is signed in, only pass properties belonging to that user
   if (options.owner_id) {
     queryParams.push(options.owner_id);
     //use conditional operator to determine if condition is already present in params, if so, use AND, else use WHERE
     queryString += `${queryParams.length > 1 ? ' AND' : 'WHERE'} owner_id = $${queryParams.length} `;
   }
 
   //if minumum cost per night is added as a peramter 
   if (options.minimum_price_per_night) {
     queryParams.push(parseInt(options.minimum_price_per_night, 10) * 100); //convert dollars to cents
     queryString += `${queryParams.length > 1 ? ' AND' : 'WHERE'} cost_per_night >= $${queryParams.length} `;
   }
 
   //if maximum cost per night is added as a peramter 
   if (options.maximum_price_per_night) {
     queryParams.push(parseInt(options.maximum_price_per_night, 10) * 100);
     queryString += `${queryParams.length > 1  ? ' AND' : 'WHERE'} cost_per_night <= $${queryParams.length} `;
   }
 
   queryString += `
   GROUP BY properties.id`;
 
   //only return properties above or equal to a minumum rating if rating specified 
   if (options.minimum_rating) {
     queryParams.push(parseInt(options.minimum_rating, 10));
     queryString += ` HAVING AVG(property_reviews.rating) >= $${queryParams.length} `;
   }
 
   //add other queries that come after WHERE
   queryParams.push(limit);
 
   queryString += `
   ORDER BY cost_per_night
   LIMIT $${queryParams.length};
   `;
 
   console.log(queryString, queryParams);
 
   return pool
     .query(queryString, queryParams)
     .then((result) => {
       return result.rows;
     })
     .catch((err) => {
       console.log(err.message);
       return null;
     });
 };

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const {
    owner_id,
    title,
    description,
    thumbnail_photo_url,
    cover_photo_url,
    cost_per_night,
    street,
    city,
    province,
    post_code,
    country,
    parking_spaces,
    number_of_bathrooms,
    number_of_bedrooms
  } = property;

  const queryParams = [
    owner_id,
    title,
    description,
    thumbnail_photo_url,
    cover_photo_url,
    cost_per_night,
    street,
    city,
    province,
    post_code,
    country,
    parking_spaces,
    number_of_bathrooms,
    number_of_bedrooms
  ];

  const queryString = `
    INSERT INTO properties (
      owner_id,
      title,
      description,
      thumbnail_photo_url,
      cover_photo_url,
      cost_per_night,
      street,
      city,
      province,
      post_code,
      country,
      parking_spaces,
      number_of_bathrooms,
      number_of_bedrooms
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    ) RETURNING *;
  `;

  return pool.query(queryString, queryParams)
    .then((res) => res.rows[0])
    .catch((err) => {
      console.error('Error executing addProperty:', err.message);
      throw err;
    });
};


module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
