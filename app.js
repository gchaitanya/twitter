const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "twitterClone.db");
const app = express();

app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};
initializeDBAndServer();

const logger = (request, response, next) => {
  console.log(request.query);
  next();
};

const authenticationToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//User Register API
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
        user (username, password, name, gender) 
      VALUES 
        (
          '${username}', 
          '${hashedPassword}',
          '${name}', 
          '${gender}'
        )`;
    await db.run(createUserQuery);
    console.log(await db.run(createUserQuery));
    response.send(`User created successfully`);
  } else if (dbUser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else if (dbUser.password.length < 6) {
    response.status(400);
    response.send("Password is too short");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get("/user/tweets/feed/", async (request, response) => {
  const getTweetQuery = `
            SELECT
                 *
            FROM
             user
            Where
             user_id = ${user_id}
             limit 4;`;
  const tweetArray = await db.all(getTweetQuery);
  response.send(tweetArray);
});

app.get("/user/following/", async (request, response) => {
  const { userId } = request.params;
  const getUserQuery = `
            SELECT
            *
            FROM
            user 
            WHERE
            user_id = ${userId};
            `;
  const book = await db.get(getUserQuery);
  response.send(book);
});

app.get("/user/followers/", authenticationToken, async (request, response) => {
  const getTweetQuery = `
            SELECT
                 *
            FROM
             user
            Where
             user_id = ${user_id}
             `;
  const tweetArray = await db.all(getTweetQuery);
  response.send(tweetArray);
});

app.get("/tweets/:tweetId/", async (request, response) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid Access Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.send("Invalid Access Token");
      } else {
        const { tweetId } = request.params;
        const getTweetQuery = `
            SELECT
            *
            FROM
            tweet 
            WHERE
            tweet_id = ${tweetId};
            `;
        const tweet = await db.get(getTweetQuery);
        response.send(tweet);
      }
    });
  }
});

module.exports = app;
