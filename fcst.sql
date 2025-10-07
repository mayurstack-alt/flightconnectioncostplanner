CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50),
    destination VARCHAR(50),
    cost INT,
    algorithm_used VARCHAR(30)
);
