# DBMS CAPSTONE PROJECT
# College Library Management System (MySQL)

---

# SECTION 1: PROJECT OVERVIEW

## Problem Statement
College libraries struggle to manage book lending, member records, and fines using manual registers. This project builds a relational database system to automate these operations efficiently.

## Objectives
- Maintain a catalog of books, authors, publishers, and categories
- Register and manage library members and librarians
- Track book copies, issue transactions, and returns
- Calculate and record fines for overdue books
- Provide useful reports through SQL queries and views

## Features
- Book catalog with multiple authors support (M:N)
- Member registration and tracking
- Book issue and return management
- Automatic fine calculation support
- Query-based reporting

## Assumptions
- Each book can have multiple copies (book_copies table)
- Fine is Rs. 2 per day after due date
- A member can borrow a maximum of 3 books at a time
- Due date is 14 days from issue date
- Only librarians can issue/return books
- A book copy can only be issued to one member at a time
# SECTION 2: ER MODEL

## Entities and Attributes

| Entity            | Attributes |
|-------------------|------------|
| publishers        | publisher_id (PK), publisher_name, address, phone, email |
| categories        | category_id (PK), category_name, description |
| authors           | author_id (PK), first_name, last_name, email |
| books             | book_id (PK), title, isbn, publisher_id (FK), category_id (FK), year_published, total_copies |
| book_authors      | book_id (FK), author_id (FK) — junction table for M:N |
| members           | member_id (PK), first_name, last_name, email, phone, address, membership_date, membership_expiry |
| librarians        | librarian_id (PK), first_name, last_name, email, phone, hire_date |
| book_copies       | copy_id (PK), book_id (FK), condition, is_available |
| issue_transactions| transaction_id (PK), copy_id (FK), member_id (FK), librarian_id (FK), issue_date, due_date, return_date, status |
| fines             | fine_id (PK), transaction_id (FK), member_id (FK), fine_amount, paid_status, fine_date |

---

## Relationships and Cardinalities

### 1. Publisher → Books (1:M)
One publisher can publish many books. Each book belongs to exactly one publisher.
- FK: books.publisher_id → publishers.publisher_id

### 2. Category → Books (1:M)
One category contains many books. Each book belongs to exactly one category.
- FK: books.category_id → categories.category_id

### 3. Books ↔ Authors (M:N)
One book can have multiple authors. One author can write multiple books.
- Resolved by junction table: book_authors(book_id, author_id)

### 4. Books → Book Copies (1:M)
One book title can have many physical copies in the library.
- FK: book_copies.book_id → books.book_id

### 5. Members → Issue Transactions (1:M)
One member can have many issue transactions over time.
- FK: issue_transactions.member_id → members.member_id

### 6. Book Copy → Issue Transactions (1:M)
One book copy can be issued multiple times (across different dates).
- FK: issue_transactions.copy_id → book_copies.copy_id

### 7. Librarian → Issue Transactions (1:M)
One librarian can process many issue/return transactions.
- FK: issue_transactions.librarian_id → librarians.librarian_id

### 8. Issue Transaction → Fine (1:1)
One overdue transaction generates one fine record.
- FK: fines.transaction_id → issue_transactions.transaction_id

---

## ER Diagram (Text Representation)

```
publishers ──(1)──< books >──(M)── book_authors ──(M)── authors
                      │
categories ──(1)──────┘
                      │
                  book_copies
                      │(M)
              issue_transactions ──── members
                      │           │
                   librarians   fines
```
# SECTION 3: NORMALIZATION

## Starting Point — Unnormalized Form (UNF)

Imagine all library data in one flat table:

```
LibraryRecord(
  member_name, member_phone, book_title, isbn, author1, author2,
  publisher_name, publisher_address, category_name,
  issue_date, due_date, return_date, fine_amount
)
```

**Problems in UNF:**
- Multiple authors in one row (repeating groups)
- Redundant publisher and category data repeated for every book
- Member details repeated for every transaction
- No atomic values (author1, author2 are not atomic)

---

## First Normal Form (1NF)

**Rule:** All attributes must be atomic. No repeating groups.

**Action:** Separate authors into their own rows. Ensure all columns hold single values.

```
LibraryRecord1NF(
  member_name, member_phone, book_title, isbn, author_name,
  publisher_name, publisher_address, category_name,
  issue_date, due_date, return_date, fine_amount
)
```

**Composite PK:** (isbn, author_name, member_name, issue_date)

**Remaining Problems:**
- publisher_address depends only on publisher_name, not on the full PK → partial dependency
- category_name is not dependent on the full key → partial dependency
- member_phone depends only on member_name → partial dependency

---

## Second Normal Form (2NF)

**Rule:** Must be in 1NF + no partial dependencies (every non-key attribute must depend on the WHOLE primary key).

**Action:** Decompose into separate tables to remove partial dependencies.

```
Books(isbn, book_title, publisher_name, publisher_address, category_name)
Authors(author_name)
BookAuthors(isbn, author_name)                ← junction table
Members(member_name, member_phone)
Transactions(isbn, member_name, issue_date, due_date, return_date, fine_amount)
```

**Functional Dependencies identified:**
- isbn → book_title, publisher_name, publisher_address, category_name
- publisher_name → publisher_address
- member_name → member_phone

**Remaining Problem:**
- publisher_address depends on publisher_name, not on isbn → transitive dependency
- category_name in Books is a transitive concern if it has its own attributes

---

## Third Normal Form (3NF)

**Rule:** Must be in 2NF + no transitive dependencies (non-key attributes must depend ONLY on the primary key, not on other non-key attributes).

**Action:** Remove transitive dependencies by creating separate tables.

```
publishers(publisher_id, publisher_name, address, phone, email)
categories(category_id, category_name, description)
authors(author_id, first_name, last_name, email)
books(book_id, title, isbn, publisher_id FK, category_id FK, year_published)
book_authors(book_id FK, author_id FK)
members(member_id, first_name, last_name, email, phone, address, membership_date)
librarians(librarian_id, first_name, last_name, email, phone, hire_date)
book_copies(copy_id, book_id FK, condition, is_available)
issue_transactions(transaction_id, copy_id FK, member_id FK, librarian_id FK, issue_date, due_date, return_date, status)
fines(fine_id, transaction_id FK, member_id FK, fine_amount, paid_status, fine_date)
```

**Now:**
- Every non-key attribute depends ONLY on its table's primary key
- No partial dependencies
- No transitive dependencies
- Database is in 3NF ✓

---

## Anomaly Removal Summary

| Anomaly | UNF Problem | 3NF Solution |
|---------|-------------|--------------|
| Insertion | Cannot add a publisher without a book | Separate publishers table |
| Update | Changing publisher address needs update in every row | Stored once in publishers table |
| Deletion | Deleting last book of a publisher loses publisher info | Publisher data independent of books |
| Redundancy | Publisher address repeated in every book row | Stored once with FK reference |
# SECTION 4: RELATIONAL SCHEMA

```
publishers(
  publisher_id    PK,
  publisher_name,
  address,
  phone,
  email
)

categories(
  category_id     PK,
  category_name,
  description
)

authors(
  author_id       PK,
  first_name,
  last_name,
  email
)

books(
  book_id         PK,
  title,
  isbn            UNIQUE,
  publisher_id    FK → publishers.publisher_id,
  category_id     FK → categories.category_id,
  year_published,
  total_copies
)

book_authors(
  book_id         FK → books.book_id,
  author_id       FK → authors.author_id,
  PRIMARY KEY (book_id, author_id)
)

members(
  member_id       PK,
  first_name,
  last_name,
  email           UNIQUE,
  phone,
  address,
  membership_date,
  membership_expiry
)

librarians(
  librarian_id    PK,
  first_name,
  last_name,
  email           UNIQUE,
  phone,
  hire_date
)

book_copies(
  copy_id         PK,
  book_id         FK → books.book_id,
  condition,
  is_available
)

issue_transactions(
  transaction_id  PK,
  copy_id         FK → book_copies.copy_id,
  member_id       FK → members.member_id,
  librarian_id    FK → librarians.librarian_id,
  issue_date,
  due_date,
  return_date,
  status
)

fines(
  fine_id         PK,
  transaction_id  FK → issue_transactions.transaction_id,
  member_id       FK → members.member_id,
  fine_amount,
  paid_status,
  fine_date
)
```

---

# SECTION 5: DATA DICTIONARY

## Table: publishers
| Column | Data Type | Size | Constraints | Description |
|--------|-----------|------|-------------|-------------|
| publisher_id | INT | — | PK, AUTO_INCREMENT | Unique publisher ID |
| publisher_name | VARCHAR | 150 | NOT NULL | Name of the publisher |
| address | VARCHAR | 255 | NULL | Publisher address |
| phone | VARCHAR | 15 | NULL | Contact number |
| email | VARCHAR | 100 | NULL | Email address |

## Table: categories
| Column | Data Type | Size | Constraints | Description |
|--------|-----------|------|-------------|-------------|
| category_id | INT | — | PK, AUTO_INCREMENT | Unique category ID |
| category_name | VARCHAR | 100 | NOT NULL, UNIQUE | Category name |
| description | TEXT | — | NULL | Category description |

## Table: authors
| Column | Data Type | Size | Constraints | Description |
|--------|-----------|------|-------------|-------------|
| author_id | INT | — | PK, AUTO_INCREMENT | Unique author ID |
| first_name | VARCHAR | 50 | NOT NULL | Author's first name |
| last_name | VARCHAR | 50 | NOT NULL | Author's last name |
| email | VARCHAR | 100 | UNIQUE, NULL | Author's email |

## Table: books
| Column | Data Type | Size | Constraints | Description |
|--------|-----------|------|-------------|-------------|
| book_id | INT | — | PK, AUTO_INCREMENT | Unique book ID |
| title | VARCHAR | 255 | NOT NULL | Book title |
| isbn | VARCHAR | 20 | NOT NULL, UNIQUE | ISBN number |
| publisher_id | INT | — | FK, NOT NULL | References publishers |
| category_id | INT | — | FK, NOT NULL | References categories |
| year_published | YEAR | — | NULL | Publication year |
| total_copies | INT | — | DEFAULT 1, CHECK ≥ 1 | Total copies owned |

## Table: book_authors
| Column | Data Type | Size | Constraints | Description |
|--------|-----------|------|-------------|-------------|
| book_id | INT | — | FK, PK part | References books |
| author_id | INT | — | FK, PK part | References authors |

## Table: members
| Column | Data Type | Size | Constraints | Description |
|--------|-----------|------|-------------|-------------|
| member_id | INT | — | PK, AUTO_INCREMENT | Unique member ID |
| first_name | VARCHAR | 50 | NOT NULL | Member's first name |
| last_name | VARCHAR | 50 | NOT NULL | Member's last name |
| email | VARCHAR | 100 | NOT NULL, UNIQUE | Member's email |
| phone | VARCHAR | 15 | NULL | Contact number |
| address | VARCHAR | 255 | NULL | Home address |
| membership_date | DATE | — | NOT NULL | Date joined |
| membership_expiry | DATE | — | NOT NULL | Membership valid until |

## Table: librarians
| Column | Data Type | Size | Constraints | Description |
|--------|-----------|------|-------------|-------------|
| librarian_id | INT | — | PK, AUTO_INCREMENT | Unique librarian ID |
| first_name | VARCHAR | 50 | NOT NULL | Librarian's first name |
| last_name | VARCHAR | 50 | NOT NULL | Librarian's last name |
| email | VARCHAR | 100 | NOT NULL, UNIQUE | Work email |
| phone | VARCHAR | 15 | NULL | Contact number |
| hire_date | DATE | — | NOT NULL | Date of joining |

## Table: book_copies
| Column | Data Type | Size | Constraints | Description |
|--------|-----------|------|-------------|-------------|
| copy_id | INT | — | PK, AUTO_INCREMENT | Unique copy ID |
| book_id | INT | — | FK, NOT NULL | References books |
| condition | ENUM | — | 'Good','Fair','Poor' | Physical condition |
| is_available | TINYINT(1) | — | DEFAULT 1 | 1=available, 0=issued |

## Table: issue_transactions
| Column | Data Type | Size | Constraints | Description |
|--------|-----------|------|-------------|-------------|
| transaction_id | INT | — | PK, AUTO_INCREMENT | Unique transaction ID |
| copy_id | INT | — | FK, NOT NULL | References book_copies |
| member_id | INT | — | FK, NOT NULL | References members |
| librarian_id | INT | — | FK, NOT NULL | References librarians |
| issue_date | DATE | — | NOT NULL | Date issued |
| due_date | DATE | — | NOT NULL | Date due for return |
| return_date | DATE | — | NULL | Actual return date |
| status | ENUM | — | 'Issued','Returned','Overdue' | Current status |

## Table: fines
| Column | Data Type | Size | Constraints | Description |
|--------|-----------|------|-------------|-------------|
| fine_id | INT | — | PK, AUTO_INCREMENT | Unique fine ID |
| transaction_id | INT | — | FK, NOT NULL | References issue_transactions |
| member_id | INT | — | FK, NOT NULL | References members |
| fine_amount | DECIMAL | 8,2 | NOT NULL, CHECK ≥ 0 | Fine in rupees |
| paid_status | ENUM | — | 'Paid','Unpaid' | Payment status |
| fine_date | DATE | — | NOT NULL | Date fine was raised |
# SECTION 11: INDEXES

## College Library Management System — MySQL 8+

---

## What is an Index?

An **index** is a data structure (similar to a book's index) that MySQL maintains alongside a table to allow rows to be found quickly without scanning every row in the table.

Without an index, MySQL performs a **full table scan** — it checks every row one by one. With an index on the right column(s), MySQL jumps directly to the matching rows, just like using a book index to find a page instead of reading every page.

> **Analogy:** Finding a student's record in a college register.
> - **No index** → read every name from page 1.
> - **With index** → go to the alphabetical index, find the page, jump straight there.

---

## Why Are Indexes Useful?

| Benefit | Explanation |
|---------|-------------|
| **Faster SELECT queries** | Lookup, filter (`WHERE`), and sort (`ORDER BY`) operations are much faster |
| **Faster JOIN operations** | MySQL uses indexes on FK columns to match rows across tables |
| **Faster search on large tables** | Effect is most visible when tables have thousands or millions of rows |
| **Efficient range queries** | `BETWEEN`, `>`, `<`, `LIKE 'abc%'` benefit from B-tree indexes |

### Trade-offs to Remember

| Cost | Explanation |
|------|-------------|
| **Storage space** | Each index occupies extra disk space |
| **Slower INSERT / UPDATE / DELETE** | MySQL must update the index whenever data changes |
| **Over-indexing is bad** | Too many indexes slow down write operations more than they help reads |

---

## Index Strategy for This Project

The following columns are the best candidates for indexing in the College Library Management System:

1. **Foreign key columns** — used in every JOIN (MySQL does not automatically index FKs).
2. **Frequently searched columns** — columns commonly used in `WHERE` or `ORDER BY` clauses.
3. **Unique identifier columns** — already covered by `PRIMARY KEY` (no extra index needed).
4. **Status / flag columns** used in filtering (e.g., `is_available`, `status`, `paid_status`).

---

## Indexes Created

### INDEX 1 — Book Title Search

```sql
CREATE INDEX idx_book_title
ON books(title);
```

**Why:** The most common search in any library is by book title. This index speeds up queries like:

```sql
SELECT * FROM books WHERE title LIKE 'Database%';
SELECT * FROM books WHERE title = 'Introduction to Algorithms';
```

---

### INDEX 2 — Book ISBN Lookup

```sql
CREATE INDEX idx_book_isbn
ON books(isbn);
```

**Why:** ISBN is used to uniquely identify books when issuing, returning, or searching. Although it has a `UNIQUE` constraint (which creates an implicit index), explicitly naming the index improves readability in the schema documentation.

```sql
SELECT * FROM books WHERE isbn = '978-0073523323';
```

---

### INDEX 3 — Book Foreign Key: Publisher

```sql
CREATE INDEX idx_book_publisher
ON books(publisher_id);
```

**Why:** Every JOIN between `books` and `publishers` uses `publisher_id`. Without this index, MySQL scans the entire `books` table for each publisher lookup.

```sql
SELECT b.title, p.publisher_name
FROM books b
JOIN publishers p ON b.publisher_id = p.publisher_id;
```

---

### INDEX 4 — Book Foreign Key: Category

```sql
CREATE INDEX idx_book_category
ON books(category_id);
```

**Why:** Category-based searches and JOINs (e.g., "list all Computer Science books") are very frequent. This index makes them fast.

```sql
SELECT * FROM books WHERE category_id = 1;
```

---

### INDEX 5 — Book Copies: Available Copies Filter

```sql
CREATE INDEX idx_copy_available
ON book_copies(is_available);
```

**Why:** The most common query on `book_copies` is finding available copies. Without this index, MySQL scans all 50+ copy rows every time.

```sql
SELECT * FROM book_copies WHERE is_available = 1;
```

---

### INDEX 6 — Book Copies: Foreign Key on book_id

```sql
CREATE INDEX idx_copy_book
ON book_copies(book_id);
```

**Why:** Used in JOINs between `book_copies` and `books` (e.g., "how many copies does this book have?"). MySQL needs this to avoid full scans of `book_copies`.

```sql
SELECT bc.copy_id, b.title
FROM book_copies bc
JOIN books b ON bc.book_id = b.book_id;
```

---

### INDEX 7 — Transactions: Status Filter

```sql
CREATE INDEX idx_txn_status
ON issue_transactions(status);
```

**Why:** Filtering by `status = 'Overdue'` or `status = 'Issued'` is done constantly by librarians. This index makes those queries instant.

```sql
SELECT * FROM issue_transactions WHERE status = 'Overdue';
SELECT * FROM issue_transactions WHERE status = 'Issued';
```

---

### INDEX 8 — Transactions: Member Foreign Key

```sql
CREATE INDEX idx_txn_member
ON issue_transactions(member_id);
```

**Why:** To view all borrowing history for a specific member, MySQL joins on `member_id`. Without this index, the entire `issue_transactions` table is scanned for every member.

```sql
SELECT * FROM issue_transactions WHERE member_id = 5;
```

---

### INDEX 9 — Fines: Paid Status Filter

```sql
CREATE INDEX idx_fine_paid_status
ON fines(paid_status);
```

**Why:** Reports for "all unpaid fines" or "all paid fines" are generated regularly. Indexing `paid_status` avoids full scans of the fines table.

```sql
SELECT * FROM fines WHERE paid_status = 'Unpaid';
```

---

### INDEX 10 — Fines: Member Foreign Key

```sql
CREATE INDEX idx_fine_member
ON fines(member_id);
```

**Why:** Finding all fines for a particular member (e.g., to check dues before issuing a new book) is a very common operation.

```sql
SELECT * FROM fines WHERE member_id = 8;
```

---

### INDEX 11 — Members: Email Lookup

```sql
CREATE INDEX idx_member_email
ON members(email);
```

**Why:** Members are often searched by email when logging in or when a librarian verifies their identity. Although `email` is UNIQUE (implicit index), naming it explicitly is good practice.

```sql
SELECT * FROM members WHERE email = 'aarav.sharma@college.edu';
```

---

### INDEX 12 — Members: Membership Expiry Filter

```sql
CREATE INDEX idx_member_expiry
ON members(membership_expiry);
```

**Why:** Librarians need to quickly identify members whose membership is expiring soon or has already expired before issuing a book.

```sql
SELECT * FROM members WHERE membership_expiry < CURDATE();
SELECT * FROM members WHERE membership_expiry BETWEEN '2025-01-01' AND '2025-12-31';
```

---

## Complete Index Creation Script

Run this block after creating all tables:

```sql
USE college_library;

-- Books
CREATE INDEX idx_book_title     ON books(title);
CREATE INDEX idx_book_isbn      ON books(isbn);
CREATE INDEX idx_book_publisher ON books(publisher_id);
CREATE INDEX idx_book_category  ON books(category_id);

-- Book Copies
CREATE INDEX idx_copy_available ON book_copies(is_available);
CREATE INDEX idx_copy_book      ON book_copies(book_id);

-- Issue Transactions
CREATE INDEX idx_txn_status     ON issue_transactions(status);
CREATE INDEX idx_txn_member     ON issue_transactions(member_id);

-- Fines
CREATE INDEX idx_fine_paid_status ON fines(paid_status);
CREATE INDEX idx_fine_member      ON fines(member_id);

-- Members
CREATE INDEX idx_member_email     ON members(email);
CREATE INDEX idx_member_expiry    ON members(membership_expiry);
```

---

## Verifying Indexes

Use `SHOW INDEX` to confirm indexes on any table:

```sql
SHOW INDEX FROM books;
SHOW INDEX FROM book_copies;
SHOW INDEX FROM issue_transactions;
SHOW INDEX FROM fines;
SHOW INDEX FROM members;
```

Use `EXPLAIN` to check whether a query is using an index:

```sql
EXPLAIN SELECT * FROM books WHERE title LIKE 'Database%';
EXPLAIN SELECT * FROM issue_transactions WHERE status = 'Overdue';
```

In the output, look at the `key` column — if it shows an index name (not `NULL`), the index is being used.

---

## Index Summary Table

| Index Name | Table | Column(s) | Purpose |
|---|---|---|---|
| idx_book_title | books | title | Book title search |
| idx_book_isbn | books | isbn | ISBN lookup |
| idx_book_publisher | books | publisher_id | Publisher JOIN |
| idx_book_category | books | category_id | Category JOIN |
| idx_copy_available | book_copies | is_available | Available copy filter |
| idx_copy_book | book_copies | book_id | Book–copy JOIN |
| idx_txn_status | issue_transactions | status | Overdue/Issued filter |
| idx_txn_member | issue_transactions | member_id | Member history lookup |
| idx_fine_paid_status | fines | paid_status | Unpaid fine filter |
| idx_fine_member | fines | member_id | Member fine lookup |
| idx_member_email | members | email | Member email search |
| idx_member_expiry | members | membership_expiry | Expiry date filter |
# SECTION 12: TESTING AND OUTPUT

## College Library Management System
### Database Testing Report — MySQL 8+

---

## Test Environment

| Parameter | Value |
|-----------|-------|
| Database | college_library |
| RDBMS | MySQL 8.0+ |
| Tool Used | MySQL Workbench / MySQL CLI |
| Test Data | Section 7 sample data (20 publishers, 15 categories, 25 authors, 50 books, 30 members, 5 librarians, 49 book copies, 40 transactions, 20 fines) |

---

## TEST CASE 1: Table Creation Test

**Objective:** Verify that all 10 tables are created correctly with proper structure.

**SQL Used:**

```sql
USE college_library;
SHOW TABLES;
```

**Expected Output:**

| Tables_in_college_library |
|---------------------------|
| authors |
| book_authors |
| book_copies |
| books |
| categories |
| fines |
| issue_transactions |
| librarians |
| members |
| publishers |

**Actual Output:** _(Run the query and paste screenshot or result here)_

---

**SQL Used (verify column structure for one table):**

```sql
DESCRIBE books;
```

**Expected Output:**

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| book_id | int | NO | PRI | NULL | auto_increment |
| title | varchar(255) | NO | | NULL | |
| isbn | varchar(20) | NO | UNI | NULL | |
| publisher_id | int | NO | MUL | NULL | |
| category_id | int | NO | MUL | NULL | |
| year_published | year | YES | | NULL | |
| total_copies | int | YES | | 1 | |

**Actual Output:** _(Paste result here)_

**Result:** PASS / FAIL

---

## TEST CASE 2: Data Insertion Test

**Objective:** Verify that all sample data inserts correctly without errors.

**SQL Used:**

```sql
SELECT COUNT(*) AS total_publishers   FROM publishers;
SELECT COUNT(*) AS total_categories   FROM categories;
SELECT COUNT(*) AS total_authors      FROM authors;
SELECT COUNT(*) AS total_books        FROM books;
SELECT COUNT(*) AS total_members      FROM members;
SELECT COUNT(*) AS total_librarians   FROM librarians;
SELECT COUNT(*) AS total_copies       FROM book_copies;
SELECT COUNT(*) AS total_transactions FROM issue_transactions;
SELECT COUNT(*) AS total_fines        FROM fines;
```

**Expected Output:**

| Table | Expected Count |
|-------|---------------|
| publishers | 20 |
| categories | 15 |
| authors | 25 |
| books | 50 |
| members | 30 |
| librarians | 5 |
| book_copies | 49 |
| issue_transactions | 40 |
| fines | 20 |

**Actual Output:** _(Paste results here)_

**Result:** PASS / FAIL

---

## TEST CASE 3: Foreign Key Constraint Test

**Objective:** Verify that foreign key constraints prevent invalid data insertion.

**SQL Used (should produce an error):**

```sql
-- Attempt to insert a book with a non-existent publisher_id
INSERT INTO books (title, isbn, publisher_id, category_id, year_published, total_copies)
VALUES ('Test Book', '999-9999999999', 9999, 1, 2024, 1);
```

**Expected Output:**

```
ERROR 1452 (23000): Cannot add or update a child row:
a foreign key constraint fails (`college_library`.`books`,
CONSTRAINT `fk_book_publisher` FOREIGN KEY (`publisher_id`)
REFERENCES `publishers` (`publisher_id`))
```

**Actual Output:** _(Paste error message here)_

---

**SQL Used (should produce an error — delete a publisher that has books):**

```sql
-- Attempt to delete a publisher that is referenced by books
DELETE FROM publishers WHERE publisher_id = 1;
```

**Expected Output:**

```
ERROR 1451 (23000): Cannot delete or update a parent row:
a foreign key constraint fails
```

**Actual Output:** _(Paste error message here)_

**Result:** PASS / FAIL

---

## TEST CASE 4: JOIN Query Test

**Objective:** Verify that JOIN queries return correct combined results from multiple tables.

**SQL Used:**

```sql
SELECT b.title, p.publisher_name, c.category_name
FROM books b
JOIN publishers p ON b.publisher_id = p.publisher_id
JOIN categories c ON b.category_id  = c.category_id
WHERE c.category_name = 'Computer Science'
ORDER BY b.title
LIMIT 5;
```

**Expected Output (first 5 Computer Science books):**

| title | publisher_name | category_name |
|-------|---------------|---------------|
| C++ Programming Language | Pearson Education | Computer Science |
| Computer Networks | Pearson Education | Computer Science |
| Computer Organization & Design | Pearson Education | Computer Science |
| Data Communications & Networking | McGraw-Hill Education | Computer Science |
| Data Structures Using C | PHI Learning | Computer Science |

**Actual Output:** _(Paste result here)_

---

**SQL Used:**

```sql
SELECT CONCAT(m.first_name, ' ', m.last_name) AS member_name,
       b.title, it.issue_date, it.status
FROM issue_transactions it
JOIN members     m  ON it.member_id = m.member_id
JOIN book_copies bc ON it.copy_id   = bc.copy_id
JOIN books       b  ON bc.book_id   = b.book_id
WHERE it.status = 'Overdue'
LIMIT 5;
```

**Expected Output:** Shows 5 overdue transactions with member names and book titles.

**Actual Output:** _(Paste result here)_

**Result:** PASS / FAIL

---

## TEST CASE 5: Nested (Subquery) Test

**Objective:** Verify that nested queries return accurate derived results.

**SQL Used:**

```sql
-- Members who have never borrowed any book
SELECT member_id,
       CONCAT(first_name, ' ', last_name) AS member_name
FROM members
WHERE member_id NOT IN (
    SELECT DISTINCT member_id FROM issue_transactions
);
```

**Expected Output:** List of members with no borrowing history. Based on sample data, members 5, 9, 15, 19, 24, and others who do not appear in issue_transactions as an issuer (cross-reference with S7 data).

**Actual Output:** _(Paste result here)_

---

**SQL Used:**

```sql
-- Book with the highest number of issues
SELECT b.title, COUNT(it.transaction_id) AS borrow_count
FROM books b
JOIN book_copies bc        ON b.book_id  = bc.book_id
JOIN issue_transactions it ON bc.copy_id = it.copy_id
GROUP BY b.book_id, b.title
ORDER BY borrow_count DESC
LIMIT 1;
```

**Expected Output:** The most borrowed book title with its count.

**Actual Output:** _(Paste result here)_

**Result:** PASS / FAIL

---

## TEST CASE 6: Aggregate Function Test

**Objective:** Verify COUNT, SUM, AVG, MIN, MAX functions work correctly.

**SQL Used:**

```sql
SELECT
    COUNT(*)         AS total_fines,
    SUM(fine_amount) AS total_collected,
    AVG(fine_amount) AS avg_fine,
    MIN(fine_amount) AS min_fine,
    MAX(fine_amount) AS max_fine
FROM fines;
```

**Expected Output (based on Section 7 sample data):**

| total_fines | total_collected | avg_fine | min_fine | max_fine |
|-------------|-----------------|----------|----------|----------|
| 20 | 252.00 | 12.60 | 6.00 | 24.00 |

**Actual Output:** _(Paste result here)_

---

**SQL Used:**

```sql
SELECT c.category_name, COUNT(b.book_id) AS book_count
FROM categories c
JOIN books b ON c.category_id = b.category_id
GROUP BY c.category_name
ORDER BY book_count DESC
LIMIT 3;
```

**Expected Output:** Top 3 categories by number of books (Computer Science should be highest with ~15 books).

**Actual Output:** _(Paste result here)_

**Result:** PASS / FAIL

---

## TEST CASE 7: View Test

**Objective:** Verify that all 10 views are created and return correct data.

**SQL Used:**

```sql
-- Confirm all views exist
SHOW FULL TABLES WHERE Table_type = 'VIEW';
```

**Expected Output:**

| Tables_in_college_library | Table_type |
|---------------------------|------------|
| active_members_view | VIEW |
| available_books_view | VIEW |
| category_book_count_view | VIEW |
| fine_summary_view | VIEW |
| issued_books_view | VIEW |
| librarian_transaction_view | VIEW |
| member_borrowing_summary_view | VIEW |
| overdue_books_view | VIEW |
| publisher_book_count_view | VIEW |
| returned_books_view | VIEW |

**Actual Output:** _(Paste result here)_

---

**SQL Used:**

```sql
-- Test overdue_books_view
SELECT member_name, book_title, days_overdue, estimated_fine_rs
FROM overdue_books_view
ORDER BY days_overdue DESC;
```

**Expected Output:** All currently overdue transactions with calculated days and estimated fine (Rs. 2/day).

**Actual Output:** _(Paste result here)_

---

**SQL Used:**

```sql
-- Test member_borrowing_summary_view for top borrowers
SELECT member_name, total_transactions, overdue_count, unpaid_fines
FROM member_borrowing_summary_view
ORDER BY total_transactions DESC
LIMIT 5;
```

**Expected Output:** Top 5 members by borrowing activity with their unpaid fine amounts.

**Actual Output:** _(Paste result here)_

**Result:** PASS / FAIL

---

## TEST CASE 8: Index Test

**Objective:** Verify that indexes are created and are being used by the query optimizer.

**SQL Used:**

```sql
-- Confirm indexes on the books table
SHOW INDEX FROM books;
```

**Expected Output (relevant indexes):**

| Table | Key_name | Column_name |
|-------|----------|-------------|
| books | PRIMARY | book_id |
| books | isbn | isbn |
| books | idx_book_title | title |
| books | idx_book_publisher | publisher_id |
| books | idx_book_category | category_id |

**Actual Output:** _(Paste result here)_

---

**SQL Used (EXPLAIN to verify index usage):**

```sql
EXPLAIN SELECT * FROM books WHERE title LIKE 'Database%';
```

**Expected Output:** The `key` column should show `idx_book_title` (not NULL), confirming the index is used.

| id | select_type | table | type | key | rows |
|----|------------|-------|------|-----|------|
| 1 | SIMPLE | books | range | idx_book_title | ~5 |

**Actual Output:** _(Paste result here)_

---

```sql
EXPLAIN SELECT * FROM issue_transactions WHERE status = 'Overdue';
```

**Expected Output:** The `key` column should show `idx_txn_status`.

**Actual Output:** _(Paste result here)_

**Result:** PASS / FAIL

---

## Test Summary

| Test Case | Description | Result |
|-----------|-------------|--------|
| TC-01 | Table Creation Test | PASS / FAIL |
| TC-02 | Data Insertion Test | PASS / FAIL |
| TC-03 | Foreign Key Constraint Test | PASS / FAIL |
| TC-04 | JOIN Query Test | PASS / FAIL |
| TC-05 | Nested Query Test | PASS / FAIL |
| TC-06 | Aggregate Function Test | PASS / FAIL |
| TC-07 | View Test | PASS / FAIL |
| TC-08 | Index Test | PASS / FAIL |

> **Instructions for submission:** Run each SQL statement in MySQL Workbench, take a screenshot of the output panel, and paste it in place of the "Actual Output" placeholder above.
