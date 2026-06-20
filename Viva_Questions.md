# SECTION 13: VIVA QUESTIONS AND ANSWERS
# College Library Management System — DBMS Project

---

## PART A: DBMS BASICS (Q1–Q10)

**Q1. What is a Database?**
A database is an organized collection of structured data stored electronically so it can be easily accessed, managed, and updated.

**Q2. What is a DBMS?**
A Database Management System (DBMS) is software that allows users to create, manage, and interact with databases. Examples: MySQL, Oracle, PostgreSQL, SQL Server.

**Q3. What is the difference between a database and a DBMS?**
A database is the actual data stored on disk. A DBMS is the software system used to store, retrieve, and manage that data.

**Q4. What is MySQL?**
MySQL is an open-source relational DBMS that uses SQL (Structured Query Language) to manage data. It is widely used for web applications and is the RDBMS used in this project.

**Q5. What is SQL?**
SQL (Structured Query Language) is the standard language used to communicate with relational databases. It supports data definition (DDL), data manipulation (DML), and data control (DCL).

**Q6. What are the main categories of SQL commands?**
- **DDL** (Data Definition Language): CREATE, ALTER, DROP, TRUNCATE
- **DML** (Data Manipulation Language): INSERT, UPDATE, DELETE, SELECT
- **DCL** (Data Control Language): GRANT, REVOKE
- **TCL** (Transaction Control Language): COMMIT, ROLLBACK, SAVEPOINT

**Q7. What is a Relational Database?**
A relational database stores data in tables (relations) with rows and columns. Tables are linked to each other using keys, and SQL is used to query the data.

**Q8. What is a schema?**
A schema is the logical structure or blueprint of a database — it defines the tables, columns, data types, and relationships without containing actual data.

**Q9. What is a table in a relational database?**
A table (also called a relation) is a two-dimensional structure made up of rows (records/tuples) and columns (attributes/fields) that stores data about a particular entity.

**Q10. What is the difference between DDL and DML?**
DDL (CREATE, ALTER, DROP) defines or modifies the structure of database objects. DML (INSERT, UPDATE, DELETE, SELECT) manipulates the actual data stored in those objects.

---

## PART B: KEYS (Q11–Q18)

**Q11. What is a Primary Key?**
A Primary Key is a column (or combination of columns) that uniquely identifies each row in a table. It cannot be NULL and must be unique.
Example: `member_id` in the `members` table.

**Q12. What is a Foreign Key?**
A Foreign Key is a column in one table that references the Primary Key of another table. It enforces referential integrity between two tables.
Example: `books.publisher_id` references `publishers.publisher_id`.

**Q13. What is a Composite Primary Key?**
A Composite Primary Key uses two or more columns together to uniquely identify a row. Neither column alone is unique, but the combination is.
Example: `book_authors(book_id, author_id)` — neither column alone uniquely identifies a row, but together they do.

**Q14. What is a Candidate Key?**
A Candidate Key is any column (or set of columns) that could serve as a Primary Key — it uniquely identifies rows and has no NULLs. A table can have multiple candidate keys; one is chosen as the Primary Key.

**Q15. What is a Super Key?**
A Super Key is any set of columns that uniquely identifies a row. It may contain extra columns beyond what is necessary. Every Primary Key is a Super Key, but not every Super Key is a Primary Key.

**Q16. What is an Alternate Key?**
An Alternate Key is a Candidate Key that was not chosen as the Primary Key. For example, `isbn` in the `books` table is an alternate key because `book_id` was chosen as the Primary Key.

**Q17. What is a Unique Key?**
A Unique Key ensures all values in a column are distinct, similar to a Primary Key, but it can contain one NULL value. Example: `email` in `members` is a UNIQUE key.

**Q18. What is a Surrogate Key?**
A Surrogate Key is an artificial, system-generated key (like AUTO_INCREMENT in MySQL) with no business meaning. Example: `member_id`, `book_id` are surrogate keys in this project.

---

## PART C: CONSTRAINTS (Q19–Q24)

**Q19. What are constraints in SQL?**
Constraints are rules enforced on columns to ensure the accuracy and integrity of data. Common constraints: NOT NULL, UNIQUE, PRIMARY KEY, FOREIGN KEY, CHECK, DEFAULT.

**Q20. What does NOT NULL mean?**
NOT NULL means the column must always have a value; it cannot be left empty. Example: `first_name VARCHAR(50) NOT NULL` ensures every member must have a first name.

**Q21. What does the CHECK constraint do?**
CHECK enforces a condition that values in a column must satisfy.
Example: `CHECK (fine_amount >= 0)` ensures a fine cannot be negative.
Example: `CHECK (total_copies >= 1)` ensures every book has at least one copy.

**Q22. What does the DEFAULT constraint do?**
DEFAULT assigns a value automatically when no value is provided during INSERT.
Example: `is_available TINYINT(1) DEFAULT 1` sets a new book copy as available by default.

**Q23. What is referential integrity?**
Referential integrity ensures that a Foreign Key value must always match an existing Primary Key value in the referenced table, or be NULL. It prevents orphan records.

**Q24. What happens if you try to delete a parent row that has child rows?**
MySQL raises ERROR 1451 because of the FOREIGN KEY RESTRICT behaviour. You must delete the child rows first before deleting the parent. This is demonstrated in the CRUD section (C9 and C10).

---

## PART D: RELATIONSHIPS AND CARDINALITY (Q25–Q30)

**Q25. What are the types of relationships in a relational database?**
- **One-to-One (1:1):** One record in Table A relates to exactly one record in Table B. Example: one issue transaction generates one fine.
- **One-to-Many (1:M):** One record in Table A relates to many records in Table B. Example: one publisher publishes many books.
- **Many-to-Many (M:N):** Many records in Table A relate to many records in Table B. Example: books and authors.

**Q26. How is a Many-to-Many relationship implemented in a relational database?**
It is broken into two One-to-Many relationships using a junction (bridge) table. In this project, `book_authors(book_id, author_id)` resolves the M:N relationship between `books` and `authors`.

**Q27. Give an example of a 1:1 relationship in this project.**
`issue_transactions` to `fines` — one overdue transaction generates exactly one fine record. The FK `fines.transaction_id` references `issue_transactions.transaction_id`.

**Q28. Give an example of a 1:M relationship in this project.**
`publishers` to `books` — one publisher can publish many books. The FK `books.publisher_id` references `publishers.publisher_id`.

**Q29. What is cardinality?**
Cardinality describes the numerical relationship between two entities — how many instances of one entity relate to how many instances of another (1:1, 1:M, or M:N).

**Q30. What is participation constraint?**
Participation constraint specifies whether every entity must participate in a relationship:
- **Total (mandatory):** Every entity must participate (shown as double line in ER).
- **Partial (optional):** Some entities may not participate (shown as single line).

---

## PART E: ER MODELING (Q31–Q35)

**Q31. What is an ER Diagram?**
An Entity-Relationship Diagram is a visual representation of the entities in a system, their attributes, and the relationships between them. It is used in the design phase before creating tables.

**Q32. What is an entity?**
An entity is a real-world object or concept about which data is stored. In this project: `books`, `members`, `librarians`, `publishers` are entities.

**Q33. What is an attribute?**
An attribute is a property or characteristic of an entity. For example, `title`, `isbn`, and `year_published` are attributes of the `books` entity.

**Q34. What is a weak entity?**
A weak entity cannot be uniquely identified by its own attributes alone — it depends on a strong entity. Example: `book_copies` depends on `books` (a copy has no meaning without the book it belongs to).

**Q35. What is a derived attribute?**
A derived attribute is one whose value can be calculated from other stored data. Example: `days_overdue` is derived from `DATEDIFF(CURDATE(), due_date)` and is not stored in any table directly.

---

## PART F: NORMALIZATION (Q36–Q44)

**Q36. What is Normalization?**
Normalization is the process of organizing a database to reduce data redundancy and improve data integrity by applying a series of rules called Normal Forms (1NF, 2NF, 3NF, etc.).

**Q37. What are the anomalies that normalization removes?**
- **Insertion anomaly:** Cannot insert data without other unrelated data being present.
- **Update anomaly:** Changing one value requires updating it in many rows.
- **Deletion anomaly:** Deleting a row unintentionally removes other important data.

**Q38. What is 1NF (First Normal Form)?**
A table is in 1NF if:
- All column values are atomic (indivisible).
- There are no repeating groups or arrays.

In this project, the UNF had `author1`, `author2` as repeating groups — moving each author to its own row achieved 1NF.

**Q39. What is 2NF (Second Normal Form)?**
A table is in 2NF if:
- It is in 1NF.
- Every non-key attribute is fully dependent on the entire Primary Key (no partial dependencies).

Partial dependency occurs when a non-key attribute depends on only part of a composite key.

**Q40. What is a partial dependency? Give an example.**
A partial dependency means a non-key attribute depends on only part of a composite primary key.
Example in 1NF: The composite PK was `(isbn, author_name, member_name, issue_date)`. `publisher_address` depended only on `publisher_name` (not the full key) — this is a partial dependency.

**Q41. What is 3NF (Third Normal Form)?**
A table is in 3NF if:
- It is in 2NF.
- There are no transitive dependencies (no non-key attribute depends on another non-key attribute).

**Q42. What is a transitive dependency? Give an example.**
A transitive dependency occurs when a non-key attribute depends on another non-key attribute rather than directly on the Primary Key.
Example: In the 2NF table `Books(isbn, title, publisher_name, publisher_address)` — `publisher_address` depends on `publisher_name`, not on `isbn`. This is a transitive dependency resolved by creating a separate `publishers` table.

**Q43. Is this project in 3NF? How do you know?**
Yes. Every non-key attribute in every table depends directly and only on its table's Primary Key. There are no partial or transitive dependencies. Publisher data is in its own table, category data is separate, and so on.

**Q44. What is BCNF (Boyce-Codd Normal Form)?**
BCNF is a stricter version of 3NF. A table is in BCNF if, for every functional dependency X → Y, X is a superkey. Most tables in this project satisfy BCNF as well.

---

## PART G: SQL — JOINS (Q45–Q49)

**Q45. What is a JOIN in SQL?**
A JOIN combines rows from two or more tables based on a related column. It is used when data needed for a result is spread across multiple tables.

**Q46. What are the types of JOINs?**
- **INNER JOIN:** Returns only rows where there is a match in both tables.
- **LEFT JOIN:** Returns all rows from the left table and matched rows from the right; NULLs for no match.
- **RIGHT JOIN:** Returns all rows from the right table and matched rows from the left.
- **FULL OUTER JOIN:** Returns all rows from both tables (not natively supported in MySQL; simulated with UNION).
- **SELF JOIN:** A table joined with itself.
- **CROSS JOIN:** Returns the Cartesian product of two tables.

**Q47. Which type of JOIN is most commonly used in this project?**
INNER JOIN, because we need only matching rows — for example, books that actually have a publisher, or transactions that actually have a member.

**Q48. Give an example of a LEFT JOIN use case in this project.**
Finding publishers who have published zero books:
```sql
SELECT p.publisher_name, COUNT(b.book_id) AS book_count
FROM publishers p
LEFT JOIN books b ON p.publisher_id = b.publisher_id
GROUP BY p.publisher_id
HAVING book_count = 0;
```
LEFT JOIN ensures publishers with no books are included (INNER JOIN would exclude them).

**Q49. What is a self-join? Where could it be used in this project?**
A self-join joins a table to itself. In this project, it is not directly used, but could theoretically be used to compare members who joined on the same date, or books published in the same year.

---

## PART H: NESTED QUERIES, VIEWS, INDEXES (Q50–Q60)

**Q50. What is a subquery (nested query)?**
A subquery is a SELECT statement embedded inside another SQL statement. It can appear in the WHERE, FROM, or SELECT clause. The inner query runs first and its result is used by the outer query.

**Q51. What is a correlated subquery?**
A correlated subquery references a column from the outer query. It is executed once for each row processed by the outer query, making it slower than a non-correlated subquery.

**Q52. What is the difference between IN and EXISTS in a subquery?**
- `IN` checks if a value matches any value in the subquery's result list.
- `EXISTS` checks whether the subquery returns any rows at all — it stops as soon as one match is found, making it faster for large datasets.

**Q53. What is a VIEW in SQL?**
A VIEW is a virtual table defined by a stored SELECT query. It does not store data itself — it shows data from underlying tables dynamically when queried. Views simplify complex queries and can restrict what data users see.

**Q54. What are the advantages of views used in this project?**
- `overdue_books_view` — librarians can instantly see all overdue books without writing a complex JOIN query every time.
- `fine_summary_view` — provides a consolidated fine report in one simple SELECT.
- Views hide complexity and present clean, readable result sets.

**Q55. Can you UPDATE data through a view?**
Yes, in simple cases where the view maps directly to one table and has no GROUP BY, DISTINCT, or aggregate functions. In this project, most views join multiple tables so they are read-only.

**Q56. What is an Index in a database?**
An index is a data structure that MySQL maintains to allow faster data retrieval. It works like a book's index — instead of scanning every row, MySQL jumps directly to the matching rows.

**Q57. What type of index does MySQL use by default?**
MySQL uses a B-Tree (Balanced Tree) index by default for most storage engines (InnoDB). B-Trees support equality checks (`=`), range queries (`BETWEEN`, `>`, `<`), and prefix searches (`LIKE 'abc%'`).

**Q58. What are the trade-offs of using indexes?**
- **Benefit:** Much faster SELECT, JOIN, and WHERE queries.
- **Cost:** Extra disk space; INSERT, UPDATE, and DELETE become slightly slower because MySQL must also update the index. Over-indexing is harmful.

**Q59. Why was `idx_txn_status` created on `issue_transactions`?**
Because `WHERE status = 'Overdue'` and `WHERE status = 'Issued'` are among the most frequent queries in any library system. Without the index, MySQL would scan all 40+ transaction rows every time. With the index, it jumps directly to matching rows.

**Q60. How do you verify whether a query is using an index?**
Use the `EXPLAIN` keyword before the SELECT statement:
```sql
EXPLAIN SELECT * FROM issue_transactions WHERE status = 'Overdue';
```
In the output, check the `key` column — if it shows an index name (not NULL), the index is being used.

---

## PART I: TRANSACTIONS AND MYSQL SPECIFICS (Q61–Q65)

**Q61. What is a database transaction?**
A transaction is a sequence of SQL operations that are treated as a single unit. Either all operations succeed (COMMIT) or all are rolled back (ROLLBACK) if any step fails. Transactions follow ACID properties.

**Q62. What are ACID properties?**
- **Atomicity:** All operations in a transaction succeed or none do.
- **Consistency:** The database moves from one valid state to another.
- **Isolation:** Concurrent transactions do not interfere with each other.
- **Durability:** Once committed, changes are permanent even after a system crash.

**Q63. What is the difference between TRUNCATE and DELETE?**
- `DELETE` removes rows one by one, fires triggers, and can be rolled back.
- `TRUNCATE` removes all rows at once, is faster, resets AUTO_INCREMENT, and cannot be rolled back in MySQL (DDL statement).

**Q64. What is AUTO_INCREMENT in MySQL?**
AUTO_INCREMENT automatically generates a unique integer value for a column each time a new row is inserted. It is used for surrogate primary keys in this project (e.g., `member_id`, `book_id`).

**Q65. What is the difference between CHAR and VARCHAR?**
- `CHAR(n)` stores a fixed-length string of exactly n characters (padded with spaces). Faster for fixed-size data.
- `VARCHAR(n)` stores a variable-length string up to n characters. More space-efficient for varying-length data. Used throughout this project for names, emails, and addresses.

---

## QUICK REFERENCE SUMMARY

| Topic | Key Point |
|-------|-----------|
| Primary Key | Unique + NOT NULL, one per table |
| Foreign Key | References PK of another table, enforces referential integrity |
| 1NF | Atomic values, no repeating groups |
| 2NF | 1NF + no partial dependencies |
| 3NF | 2NF + no transitive dependencies |
| INNER JOIN | Only matching rows from both tables |
| LEFT JOIN | All rows from left + matching from right |
| Subquery | SELECT inside another SELECT |
| VIEW | Virtual table from a stored query |
| INDEX | Speeds up SELECT; slows INSERT/UPDATE/DELETE |
| ACID | Atomicity, Consistency, Isolation, Durability |
| AUTO_INCREMENT | Automatic unique integer for PK columns |
