import Database from "better-sqlite3";
import { createQueryAllFunction, createQueryIteratorFunction, createQuerySingleFunction } from "../src";

const databaseSchema = `
CREATE TABLE user (
    id INT,
    name TEXT
);
CREATE TABLE video (
    id INT,
    user INT,
    title TEXT
);
`;

const db = new Database(":memory:");
db.exec(`
    INSERT INTO user VALUES
        (1, 'user-a'),
        (2, 'user-b'),
        (3, 'user-c')
`);
db.exec(`
    INSERT video VALUES
        (1, 1, 'video-1-user-a'),
        (1, 2, 'video-2-user-a'),
        (1, 3, 'video-3-user-a'),
        (2, 1, 'video-1-user-b');
`);

const getSingle = createQuerySingleFunction((q, ...p) => db.prepare(q).get(...p), databaseSchema);
const getAll = createQueryAllFunction((q, ...p) => db.prepare(q).all(...p), databaseSchema);
const getCursor = createQueryIteratorFunction((q, ...p) => db.prepare(q).iterate(...p), databaseSchema);

const user = getSingle("SELECT name FROM user WHERE id = ?", 1);

for(const u of getCursor("SELECT u.id, u.name AS userName, v.title AS videoTitle FROM user AS u INNER JOIN video AS v ON u.id = v.user")) {
    console.log(u);
}

