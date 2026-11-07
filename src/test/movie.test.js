const request = require("supertest");
const app = require("../app");
const Movie = require("../model/movie");
const User = require("../model/user.model");
const mongoose = require("mongoose");
const statusCode = require("../utils/statuscode");
const bcrypt = require("bcryptjs");

let accessToken;
let secretKey;
let admin;


const createAdmin = async () => {
  const password = await bcrypt.hash("Password@123", 10);

  return await User.create({
    name: "Movie Test Admin",
    email: "movietest@gmail.com",
    phone: 8101243522,
    password,
    role: "admin",
    image: "hello.jpg",
    public_id: "test_public_id",
    is_Verified: true,
    is_Deleted: false,
    isActive: true,
    status: "active",
  });
};


const createMovie = async (data = {}) => {
  return await Movie.create({
    name: "Test Movie",
    genre: "Action",
    language: "English",
    duration: 120,
    cast: ["Actor One", "Actor Two"],
    director: "Test Director",
    releaseDate: new Date("2026-10-01"),
    description: "This is a test movie description",
    poster: "https://example.com/test-poster.jpg",
    isDeleted: false,
    ...data,
  });
};


const loginAdmin = async () => {
  const res = await request(app)
    .post("/v1/api/login")
    .send({
      email: "movietest@gmail.com",
      password: "Password@123",
    });

  console.log("Movie test login response:", res.body);

  expect(res.statusCode).toBe(statusCode.OK);
  expect(res.body.status).toBe(true);

  return {
    token: res.body.accessToken,
    secretKey: res.body.secretKey,
  };
};


const authHeaders = () => ({
  Authorization: `Bearer ${accessToken}`,
  "x-secret-key": secretKey,
});

beforeAll(async () => {
  if (!process.env.MONGODB_TEST_URI) {
    throw new Error("MONGODB_TEST_URI is not configured");
  }

  await mongoose.connect(process.env.MONGODB_TEST_URI, {
    serverSelectionTimeoutMS: 40000,
  });

  admin = await createAdmin();

  const auth = await loginAdmin();

  accessToken = auth.token;
  secretKey = auth.secretKey;

  if (!accessToken || !secretKey) {
    throw new Error("Test authentication failed. Token or secretKey missing.");
  }
}, 40000);


afterEach(async () => {
  await Movie.deleteMany({
    name: { $regex: /^Test Movie/ },
  });
}, 15000);


afterAll(async () => {
  await Movie.deleteMany({
    name: { $regex: /^Test Movie/ },
  });

  if (admin?._id) {
    await User.deleteOne({ _id: admin._id });
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}, 40000);

jest.setTimeout(40000);

describe("Movie CRUD API", () => {

 
  it("should create a movie successfully", async () => {
    const res = await request(app)
  .post("/v1/api/addMovie")
  .set("Authorization", `Bearer ${token}`)
  .set("x-secret-key", secretKey)
  .send({
    name: "Test Movie One",
    genre: "Action",
    language: "English",
    duration: 120,
    cast: ["Actor One", "Actor Two"],
    director: "Test Director",
    releaseDate: "2026-10-01",
    description: "This is a test movie description",
  });

console.log("Add Movie Status:", res.statusCode);
console.log("Add Movie Response:", res.body);

    expect(res.statusCode).toBe(statusCode.CREATED);
    expect(res.body.status).toBe(true);
    expect(res.body.message).toBe("Movie created successfully");
    expect(res.body.data.name).toBe("Test Movie One");
  });

 
  it("should get all movies successfully", async () => {
    await createMovie();

    const res = await request(app)
      .get("/v2/api/getAllMovie")
      .set(authHeaders());

    console.log("Get All Movies Response:", res.body);

    expect(res.statusCode).toBe(statusCode.OK);
    expect(res.body.status).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe("Test Movie");
  });


  it("should get movies with search and pagination", async () => {
    await createMovie({
      name: "Test Movie Avengers",
      genre: "Action",
    });

    await createMovie({
      name: "Test Movie Comedy",
      genre: "Comedy",
    });

    const res = await request(app)
      .get("/v2/api/getAllMovie")
      .query({
        name: "Avengers",
        genre: "Action",
        page: 1,
        limit: 5,
      })
      .set(authHeaders());

    console.log("Search Movies Response:", res.body);

    expect(res.statusCode).toBe(statusCode.OK);
    expect(res.body.status).toBe(true);
    expect(res.body.totalMovies).toBe(1);
    expect(res.body.currentPage).toBe(1);
    expect(res.body.data[0].name).toBe("Test Movie Avengers");
  });


  it("should get movie by id successfully", async () => {
    const movie = await createMovie();

    const res = await request(app)
      .get(`/v2/api/getMovieById/${movie._id}`)
      .set(authHeaders());

    console.log("Get Movie By ID Response:", res.body);

    expect(res.statusCode).toBe(statusCode.OK);
    expect(res.body.status).toBe(true);
    expect(res.body.message).toBe("Movie fetched successfully");
    expect(res.body.data.name).toBe("Test Movie");
  });


  it("should update movie successfully", async () => {
    const movie = await createMovie();

    const res = await request(app)
      .put(`/v2/api/updateMovie/${movie._id}`)
      .set(authHeaders())
      .send({
        name: "Test Movie Updated",
        genre: "Drama",
        language: "Hindi",
        duration: 135,
        cast: ["Actor Three", "Actor Four"],
        director: "Updated Director",
        releaseDate: "2026-11-01",
        description: "Updated movie description",
      });

    console.log("Update Movie Status:", res.statusCode);
    console.log("Update Movie Response:", res.body);

    expect(res.statusCode).toBe(statusCode.OK);
    expect(res.body.status).toBe(true);
    expect(res.body.message).toBe("Movie updated successfully");
    expect(res.body.data.name).toBe("Test Movie Updated");

    const updatedMovie = await Movie.findById(movie._id);

    expect(updatedMovie.name).toBe("Test Movie Updated");
  });


  it("should soft delete movie successfully", async () => {
    const movie = await createMovie();

    const res = await request(app)
      .delete(`/v2/api/softdeletmovie/${movie._id}`)
      .set(authHeaders());

    console.log("Soft Delete Movie Response:", res.body);

    expect(res.statusCode).toBe(statusCode.OK);
    expect(res.body.status).toBe(true);
    expect(res.body.message).toBe("Movie deleted successfully");

    const deletedMovie = await Movie.findById(movie._id);

    expect(deletedMovie).not.toBeNull();
    expect(deletedMovie.isDeleted).toBe(true);
  });

 
  it("should restore deleted movie successfully", async () => {
    const movie = await createMovie({
      isDeleted: true,
    });

    const res = await request(app)
      .patch(`/v2/api/retrieveDeletedMovie/${movie._id}`)
      .set(authHeaders());

    console.log("Restore Movie Response:", res.body);

    expect(res.statusCode).toBe(statusCode.OK);
    expect(res.body.status).toBe(true);
    expect(res.body.message).toBe("Movie restored successfully");

    const restoredMovie = await Movie.findById(movie._id);

    expect(restoredMovie).not.toBeNull();
    expect(restoredMovie.isDeleted).toBe(false);
  });

 
  it("should permanently delete movie successfully", async () => {
    const movie = await createMovie({
      isDeleted: true,
    });

    const res = await request(app)
      .delete(`/v2/api/forceDeleteMovie/${movie._id}`)
      .set(authHeaders());

    console.log("Force Delete Movie Response:", res.body);

    expect(res.statusCode).toBe(statusCode.OK);
    expect(res.body.status).toBe(true);
    expect(res.body.message).toBe(
      "Movie permanently deleted successfully"
    );

    const deletedMovie = await Movie.findById(movie._id);

    expect(deletedMovie).toBeNull();
  });

});