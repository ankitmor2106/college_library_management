
-- TABLE 1: publishers
CREATE TABLE publishers (
    publisher_id    SERIAL PRIMARY KEY,
    publisher_name  VARCHAR(150) NOT NULL,
    address         VARCHAR(255),
    phone           VARCHAR(15),
    email           VARCHAR(100)
);

-- TABLE 2: categories
CREATE TABLE categories (
    category_id     SERIAL PRIMARY KEY,
    category_name   VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT
);

-- TABLE 3: authors
CREATE TABLE authors (
    author_id       SERIAL PRIMARY KEY,
    first_name      VARCHAR(50) NOT NULL,
    last_name       VARCHAR(50) NOT NULL,
    email           VARCHAR(100) UNIQUE
);

-- TABLE 4: books
CREATE TABLE books (
    book_id         SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    isbn            VARCHAR(20) NOT NULL UNIQUE,
    publisher_id    BIGINT UNSIGNED NOT NULL,
    category_id     BIGINT UNSIGNED NOT NULL,
    year_published  YEAR,
    total_copies    INT DEFAULT 1,
    CONSTRAINT chk_copies CHECK (total_copies >= 1),
    CONSTRAINT fk_book_publisher FOREIGN KEY (publisher_id) REFERENCES publishers(publisher_id),
    CONSTRAINT fk_book_category  FOREIGN KEY (category_id)  REFERENCES categories(category_id)
);

-- TABLE 5: book_authors (M:N junction table)
CREATE TABLE book_authors (
    book_id         BIGINT UNSIGNED NOT NULL,
    author_id       BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (book_id, author_id),
    CONSTRAINT fk_ba_book   FOREIGN KEY (book_id)   REFERENCES books(book_id),
    CONSTRAINT fk_ba_author FOREIGN KEY (author_id) REFERENCES authors(author_id)
);

-- TABLE 6: members
CREATE TABLE members (
    member_id           SERIAL PRIMARY KEY,
    first_name          VARCHAR(50) NOT NULL,
    last_name           VARCHAR(50) NOT NULL,
    email               VARCHAR(100) NOT NULL UNIQUE,
    phone               VARCHAR(15),
    address             VARCHAR(255),
    membership_date     DATE NOT NULL,
    membership_expiry   DATE NOT NULL
);

-- TABLE 7: librarians
CREATE TABLE librarians (
    librarian_id    SERIAL PRIMARY KEY,
    first_name      VARCHAR(50) NOT NULL,
    last_name       VARCHAR(50) NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    phone           VARCHAR(15),
    hire_date       DATE NOT NULL
);

-- TABLE 8: book_copies
CREATE TABLE book_copies (
    copy_id         SERIAL PRIMARY KEY,
    book_id         BIGINT UNSIGNED NOT NULL,
    book_condition  ENUM('Good', 'Fair', 'Poor') DEFAULT 'Good',
    is_available    TINYINT(1) DEFAULT 1,
    CONSTRAINT fk_copy_book FOREIGN KEY (book_id) REFERENCES books(book_id)
);

-- TABLE 9: issue_transactions
CREATE TABLE issue_transactions (
    transaction_id  SERIAL PRIMARY KEY,
    copy_id         BIGINT UNSIGNED NOT NULL,
    member_id       BIGINT UNSIGNED NOT NULL,
    librarian_id    BIGINT UNSIGNED NOT NULL,
    issue_date      DATE NOT NULL,
    due_date        DATE NOT NULL,
    return_date     DATE,
    status          ENUM('Issued', 'Returned', 'Overdue') DEFAULT 'Issued',
    CONSTRAINT fk_it_copy      FOREIGN KEY (copy_id)      REFERENCES book_copies(copy_id),
    CONSTRAINT fk_it_member    FOREIGN KEY (member_id)    REFERENCES members(member_id),
    CONSTRAINT fk_it_librarian FOREIGN KEY (librarian_id) REFERENCES librarians(librarian_id)
);

-- TABLE 10: fines
CREATE TABLE fines (
    fine_id         SERIAL PRIMARY KEY,
    transaction_id  BIGINT UNSIGNED NOT NULL,
    member_id       BIGINT UNSIGNED NOT NULL,
    fine_amount     DECIMAL(8,2) NOT NULL,
    paid_status     ENUM('Paid', 'Unpaid') DEFAULT 'Unpaid',
    fine_date       DATE NOT NULL,
    CONSTRAINT chk_fine    CHECK (fine_amount >= 0),
    CONSTRAINT fk_fine_txn FOREIGN KEY (transaction_id) REFERENCES issue_transactions(transaction_id),
    CONSTRAINT fk_fine_mem FOREIGN KEY (member_id)      REFERENCES members(member_id)
);

-- SAMPLE DATA


-- 20 Publishers
INSERT INTO publishers (publisher_name, address, phone, email) VALUES
('Oxford University Press',   'Great Clarendon St, Oxford',     '011-45678901', 'info@oup.com'),
('Pearson Education',         'KG Marg, New Delhi',             '011-23456789', 'info@pearson.com'),
('McGraw-Hill Education',     'Noida, Uttar Pradesh',           '011-34567890', 'info@mgh.com'),
('Tata McGraw-Hill',          'Connaught Place, New Delhi',     '011-56789012', 'info@tmh.com'),
('Wiley India',               'Daryaganj, New Delhi',           '011-67890123', 'info@wiley.in'),
('S. Chand & Company',        'Ramnagar, New Delhi',            '011-78901234', 'info@schand.com'),
('Cengage Learning',          'Mehrauli, New Delhi',            '011-89012345', 'info@cengage.com'),
('Springer India',            'Connaught Place, New Delhi',     '011-90123456', 'info@springer.in'),
('Cambridge University Press','Shaftesbury Road, Cambridge',    '011-01234567', 'info@cup.com'),
('PHI Learning',              'Ansari Road, Daryaganj',         '011-11223344', 'info@phi.com'),
('BPB Publications',          'Ansari Road, New Delhi',         '011-22334455', 'info@bpb.com'),
('Arihant Publishers',        'Meerut, Uttar Pradesh',          '0121-3456789', 'info@arihant.com'),
('Laxmi Publications',        'Ansari Road, New Delhi',         '011-33445566', 'info@laxmi.com'),
('Nai Sarak Publications',    'Chandni Chowk, Delhi',           '011-44556677', 'info@naisarak.com'),
('Academic Press',            'London, UK',                     '011-55667788', 'info@academic.com'),
('Elsevier India',            'Ansari Road, New Delhi',         '011-66778899', 'info@elsevier.in'),
('Orient Blackswan',          'Hyderabad, Telangana',           '040-12345678', 'info@orientblack.com'),
('Himalaya Publishing',       'Churchgate, Mumbai',             '022-23456789', 'info@himalaya.com'),
('New Age International',     'Daryaganj, New Delhi',           '011-77889900', 'info@newage.com'),
('Notion Press',              'Anna Nagar, Chennai',            '044-34567890', 'info@notion.com');

-- 15 Categories
INSERT INTO categories (category_name, description) VALUES
('Computer Science',      'Programming, algorithms, databases, OS'),
('Mathematics',           'Calculus, algebra, statistics, discrete maths'),
('Physics',               'Classical, quantum, and modern physics'),
('Chemistry',             'Organic, inorganic, and physical chemistry'),
('Electronics',           'Circuit theory, digital electronics, microprocessors'),
('Mechanical Engineering','Thermodynamics, manufacturing, mechanics'),
('Civil Engineering',     'Structures, surveying, fluid mechanics'),
('Literature',            'Fiction, poetry, drama, literary criticism'),
('History',               'Ancient, medieval, modern world history'),
('Economics',             'Micro, macro, international economics'),
('Management',            'Business management, marketing, HRM'),
('Biology',               'Botany, zoology, microbiology, genetics'),
('Law',                   'Constitutional, criminal, civil law'),
('Psychology',            'Cognitive, social, developmental psychology'),
('Environmental Science', 'Ecology, pollution, sustainable development');

-- 25 Authors
INSERT INTO authors (first_name, last_name, email) VALUES
('Abraham',   'Silberschatz', 'abraham.s@dbbooks.com'),
('Henry',     'Korth',        'henry.k@dbbooks.com'),
('Ramez',     'Elmasri',      'ramez.e@cs.edu'),
('Shamkant',  'Navathe',      'shamkant.n@cs.edu'),
('C.J.',      'Date',         'cj.date@relational.com'),
('E.F.',      'Codd',         NULL),
('Donald',    'Knuth',        'donald.k@taocp.com'),
('Bjarne',    'Stroustrup',   'bjarne.s@cpp.com'),
('Dennis',    'Ritchie',      NULL),
('Brian',     'Kernighan',    'brian.k@bell.com'),
('Andrew',    'Tanenbaum',    'andrew.t@os.com'),
('William',   'Stallings',    'william.s@os.com'),
('Forouzan',  'Behrouz',      'behrouz.f@net.com'),
('Naresh',    'Chauhan',      'naresh.c@ds.com'),
('Sartaj',    'Sahni',        'sartaj.s@algorithms.com'),
('Cormen',    'Thomas',       'thomas.c@clrs.com'),
('James',     'Gosling',      'james.g@java.com'),
('Herbert',   'Schildt',      'herbert.s@java.com'),
('Robert',    'Lafore',       'robert.l@oop.com'),
('Yashwant',  'Kanetkar',     'yashwant.k@c.com'),
('Seymour',   'Lipschutz',    'seymour.l@math.com'),
('H.C.',      'Verma',        'hc.verma@physics.com'),
('P.K.',      'Nag',          'pk.nag@mech.com'),
('R.K.',      'Rajput',       'rk.rajput@mech.com'),
('Arun',      'Sharma',       'arun.s@aptitude.com');

-- 50 Books
INSERT INTO books (title, isbn, publisher_id, category_id, year_published, total_copies) VALUES
('Database System Concepts',          '978-0073523323', 1,  1, 2019, 3),
('Fundamentals of Database Systems',  '978-0133970777', 2,  1, 2015, 2),
('An Introduction to Database Systems','978-0321197849',9,  1, 2003, 2),
('The Art of Computer Programming',   '978-0201853926', 1,  1, 2011, 2),
('The C Programming Language',        '978-0131103627', 3,  1, 1988, 3),
('C++ Programming Language',          '978-0321563842', 2,  1, 2013, 2),
('Operating System Concepts',         '978-1118063330', 5,  1, 2018, 3),
('Modern Operating Systems',          '978-0136006633', 2,  1, 2014, 2),
('Computer Networks',                 '978-0132126953', 2,  1, 2010, 2),
('Data Structures Using C',           '978-0198066425', 10, 1, 2016, 3),
('Introduction to Algorithms',        '978-0262033848', 1,  1, 2009, 3),
('Java: The Complete Reference',      '978-1260440249', 3,  1, 2019, 2),
('Let Us C',                          '978-9387284630', 11, 1, 2020, 4),
('Data Communications & Networking',  '978-0073376226', 3,  1, 2012, 2),
('Computer Organization & Design',    '978-0128017333', 2,  1, 2017, 2),
('Higher Engineering Mathematics',    '978-1259062506', 4,  2, 2014, 3),
('Discrete Mathematics',              '978-0070681484', 3,  2, 2016, 2),
('Engineering Mathematics Vol 1',     '978-8131526286', 7,  2, 2018, 2),
('Probability and Statistics',        '978-0070648951', 4,  2, 2013, 2),
('Linear Algebra and Its Applications','978-0321982384',2,  2, 2016, 2),
('Concepts of Physics Part 1',        '978-8177091878', 6,  3, 2018, 3),
('Concepts of Physics Part 2',        '978-8177092110', 6,  3, 2018, 3),
('University Physics',                '978-0321501219', 2,  3, 2015, 2),
('Physics for Scientists & Engineers','978-0321570529', 2,  3, 2013, 2),
('Modern Physics',                    '978-0077263911', 3,  3, 2012, 2),
('Organic Chemistry',                 '978-0198069478', 1,  4, 2017, 2),
('Physical Chemistry',                '978-0198557654', 1,  4, 2016, 2),
('Inorganic Chemistry',               '978-0198767602', 1,  4, 2019, 2),
('Engineering Chemistry',             '978-8121935654', 13, 4, 2015, 3),
('Atkins Physical Chemistry',         '978-0198769866', 1,  4, 2018, 2),
('Electronic Devices & Circuits',     '978-0070607989', 3,  5, 2016, 3),
('Digital Electronics',               '978-8131786543', 4,  5, 2015, 2),
('Microprocessors & Microcontrollers','978-0070667648', 3,  5, 2017, 2),
('Circuit Theory',                    '978-8120338593', 10, 5, 2016, 2),
('Analog Electronics',                '978-8131776421', 7,  5, 2014, 2),
('Engineering Thermodynamics',        '978-0070648760', 3,  6, 2018, 3),
('Fluid Mechanics',                   '978-0071333154', 3,  6, 2015, 2),
('Strength of Materials',             '978-8121926560', 13, 6, 2016, 2),
('Machine Design',                    '978-0070324947', 3,  6, 2014, 2),
('Manufacturing Science',             '978-8131773352', 7,  6, 2017, 2),
('RCC Design',                        '978-8121912110', 13, 7, 2016, 2),
('Fluid Mechanics in Civil Engg',     '978-8121915625', 13, 7, 2015, 2),
('Surveying Vol 1',                   '978-8121924627', 13, 7, 2017, 2),
('English Literature Companion',      '978-0198064589', 1,  8, 2016, 2),
('Pride and Prejudice',               '978-0141439518', 9,  8, 2002, 2),
('World History',                     '978-0199760039', 1,  9, 2014, 2),
('Indian History',                    '978-8125036548', 17, 9, 2018, 3),
('Principles of Economics',           '978-1337514002', 7,  10, 2018, 2),
('Business Management',               '978-8120351288', 10, 11, 2017, 2),
('Environmental Studies',             '978-8131522646', 7,  15, 2019, 3);

-- book_authors (M:N links)
INSERT INTO book_authors (book_id, author_id) VALUES
(1,1),(1,2),(2,3),(2,4),(3,5),(4,7),(5,9),(5,10),
(6,8),(7,1),(8,11),(9,13),(10,14),(11,16),(12,18),
(13,20),(14,13),(15,1),(16,21),(17,21),(18,21),
(19,21),(20,21),(21,22),(22,22),(23,22),(24,22),
(25,22),(26,5),(27,5),(28,5),(29,5),(30,5),
(31,13),(32,13),(33,13),(34,13),(35,13),
(36,23),(37,23),(38,24),(39,23),(40,24),
(41,24),(42,24),(43,24),(44,1),(45,1),
(46,1),(47,1),(48,1),(49,1),(50,1);

-- 30 Members
INSERT INTO members (first_name, last_name, email, phone, address, membership_date, membership_expiry) VALUES
('Aarav',    'Sharma',   'aarav.sharma@college.edu',   '9876543210', 'A-12 Raj Nagar, Ghaziabad',        '2023-06-01', '2025-05-31'),
('Priya',    'Singh',    'priya.singh@college.edu',    '9865432109', 'B-34 Indirapuram, Ghaziabad',       '2023-06-01', '2025-05-31'),
('Rohan',    'Verma',    'rohan.verma@college.edu',    '9854321098', 'C-56 Vaishali, Ghaziabad',          '2023-07-01', '2025-06-30'),
('Sneha',    'Gupta',    'sneha.gupta@college.edu',    '9843210987', 'D-78 Kaushambi, Ghaziabad',         '2023-07-15', '2025-07-14'),
('Amit',     'Yadav',    'amit.yadav@college.edu',     '9832109876', 'E-90 Crossing Republik',             '2023-08-01', '2025-07-31'),
('Kavya',    'Patel',    'kavya.patel@college.edu',    '9821098765', 'F-11 Sanjay Nagar, Ghaziabad',      '2023-08-15', '2025-08-14'),
('Vikram',   'Rao',      'vikram.rao@college.edu',     '9810987654', 'G-22 Raj Nagar Extn',               '2023-09-01', '2025-08-31'),
('Ananya',   'Mehta',    'ananya.mehta@college.edu',   '9809876543', 'H-33 Shakti Khand',                 '2023-09-15', '2025-09-14'),
('Rajesh',   'Kumar',    'rajesh.kumar@college.edu',   '9798765432', 'I-44 Nyay Khand',                   '2023-10-01', '2025-09-30'),
('Pooja',    'Mishra',   'pooja.mishra@college.edu',   '9787654321', 'J-55 Ahinsa Khand',                 '2023-10-15', '2025-10-14'),
('Suresh',   'Pandey',   'suresh.pandey@college.edu',  '9776543210', 'K-66 Vasundhara, Ghaziabad',        '2023-11-01', '2025-10-31'),
('Nisha',    'Tiwari',   'nisha.tiwari@college.edu',   '9765432109', 'L-77 Sahibabad, Ghaziabad',         '2023-11-15', '2025-11-14'),
('Deepak',   'Joshi',    'deepak.joshi@college.edu',   '9754321098', 'M-88 Mohan Nagar',                  '2023-12-01', '2025-11-30'),
('Ritu',     'Agarwal',  'ritu.agarwal@college.edu',   '9743210987', 'N-99 Dilshad Garden',               '2023-12-15', '2025-12-14'),
('Arjun',    'Chauhan',  'arjun.chauhan@college.edu',  '9732109876', 'O-10 Loni, Ghaziabad',              '2024-01-01', '2026-12-31'),
('Divya',    'Srivastava','divya.sri@college.edu',     '9721098765', 'P-21 Hindon Village',               '2024-01-15', '2026-01-14'),
('Manish',   'Dubey',    'manish.dubey@college.edu',   '9710987654', 'Q-32 Govindpuram',                  '2024-02-01', '2026-01-31'),
('Sakshi',   'Shukla',   'sakshi.shukla@college.edu',  '9709876543', 'R-43 Pratap Vihar',                 '2024-02-15', '2026-02-14'),
('Ankur',    'Tripathi',  'ankur.tri@college.edu',     '9698765432', 'S-54 Gandhi Nagar',                 '2024-03-01', '2026-02-28'),
('Swati',    'Goel',     'swati.goel@college.edu',     '9687654321', 'T-65 Niti Khand',                   '2024-03-15', '2026-03-14'),
('Rahul',    'Saxena',   'rahul.saxena@college.edu',   '9676543210', 'U-76 Sector 4 Vaishali',            '2024-04-01', '2026-03-31'),
('Priyanka', 'Bhatt',    'priyanka.bhatt@college.edu', '9665432109', 'V-87 Sector 5 Vaishali',            '2024-04-15', '2026-04-14'),
('Saurabh',  'Singh',    'saurabh.singh@college.edu',  '9654321098', 'W-98 Indirapuram',                  '2024-05-01', '2026-04-30'),
('Megha',    'Kapoor',   'megha.kapoor@college.edu',   '9643210987', 'X-09 Kaushambi',                    '2024-05-15', '2026-05-14'),
('Nitin',    'Bhardwaj', 'nitin.bh@college.edu',       '9632109876', 'Y-11 Raj Nagar',                    '2024-06-01', '2026-05-31'),
('Komal',    'Yadav',    'komal.yadav@college.edu',    '9621098765', 'Z-22 Crossings Republik',           '2024-06-15', '2026-06-14'),
('Harshit',  'Rawat',    'harshit.rawat@college.edu',  '9610987654', 'AA-33 Sanjay Nagar',                '2024-07-01', '2026-06-30'),
('Tanvi',    'Singh',    'tanvi.singh@college.edu',    '9609876543', 'BB-44 Shakti Khand',                '2024-07-15', '2026-07-14'),
('Kunal',    'Pathak',   'kunal.pathak@college.edu',   '9598765432', 'CC-55 Nyay Khand',                  '2024-08-01', '2026-07-31'),
('Neha',     'Dixit',    'neha.dixit@college.edu',     '9587654321', 'DD-66 Sector 62, Noida',            '2024-08-15', '2026-08-14');

-- 5 Librarians
INSERT INTO librarians (first_name, last_name, email, phone, hire_date) VALUES
('Sunita',   'Devi',     'sunita.devi@library.edu',   '9876512340', '2018-04-01'),
('Ramesh',   'Nair',     'ramesh.nair@library.edu',   '9865423410', '2019-06-15'),
('Geeta',    'Bajaj',    'geeta.bajaj@library.edu',   '9854234560', '2020-01-10'),
('Anil',     'Sharma',   'anil.sharma@library.edu',   '9843123450', '2021-07-20'),
('Priti',    'Malhotra', 'priti.malhotra@library.edu','9832012340', '2022-03-05');

-- 50 Book Copies
INSERT INTO book_copies (book_id, book_condition, is_available) VALUES
(1,'Good',1),(1,'Good',1),(1,'Fair',1),
(2,'Good',1),(2,'Good',1),
(3,'Good',1),(3,'Fair',1),
(4,'Good',1),(4,'Good',1),
(5,'Good',1),(5,'Good',1),(5,'Fair',1),
(6,'Good',1),(6,'Good',1),
(7,'Good',1),(7,'Good',1),(7,'Fair',1),
(8,'Good',1),(8,'Good',1),
(9,'Good',1),(9,'Good',1),
(10,'Good',1),(10,'Good',1),(10,'Fair',1),
(11,'Good',1),(11,'Good',1),(11,'Fair',1),
(12,'Good',1),(12,'Good',1),
(13,'Good',1),(13,'Good',1),(13,'Good',1),(13,'Fair',1),
(14,'Good',1),(14,'Fair',1),
(15,'Good',1),(15,'Good',1),
(16,'Good',1),(16,'Good',1),(16,'Fair',1),
(17,'Good',1),(17,'Good',1),
(21,'Good',1),(21,'Good',1),(21,'Fair',1),
(22,'Good',1),(22,'Good',1),
(31,'Good',1),(31,'Good',1);

-- 40 Issue Transactions
INSERT INTO issue_transactions (copy_id, member_id, librarian_id, issue_date, due_date, return_date, status) VALUES
(1,  1, 1, '2024-07-01', '2024-07-15', '2024-07-14', 'Returned'),
(4,  2, 1, '2024-07-02', '2024-07-16', '2024-07-20', 'Returned'),
(7,  3, 2, '2024-07-03', '2024-07-17', '2024-07-17', 'Returned'),
(10, 4, 2, '2024-07-05', '2024-07-19', '2024-07-25', 'Returned'),
(13, 5, 3, '2024-07-06', '2024-07-20', NULL,          'Overdue'),
(16, 6, 3, '2024-07-07', '2024-07-21', '2024-07-21', 'Returned'),
(19, 7, 4, '2024-07-08', '2024-07-22', '2024-07-30', 'Returned'),
(22, 8, 4, '2024-07-09', '2024-07-23', '2024-07-23', 'Returned'),
(25, 9, 5, '2024-07-10', '2024-07-24', NULL,          'Overdue'),
(28, 10,5, '2024-07-11', '2024-07-25', '2024-07-28', 'Returned'),
(2,  11,1, '2024-07-12', '2024-07-26', '2024-07-26', 'Returned'),
(5,  12,1, '2024-07-13', '2024-07-27', '2024-08-01', 'Returned'),
(8,  13,2, '2024-07-14', '2024-07-28', '2024-07-28', 'Returned'),
(11, 14,2, '2024-07-15', '2024-07-29', '2024-08-05', 'Returned'),
(14, 15,3, '2024-07-16', '2024-07-30', NULL,          'Overdue'),
(17, 16,3, '2024-07-17', '2024-07-31', '2024-07-31', 'Returned'),
(20, 17,4, '2024-07-18', '2024-08-01', '2024-08-04', 'Returned'),
(23, 18,4, '2024-07-19', '2024-08-02', '2024-08-02', 'Returned'),
(26, 19,5, '2024-07-20', '2024-08-03', NULL,          'Overdue'),
(29, 20,5, '2024-07-21', '2024-08-04', '2024-08-10', 'Returned'),
(3,  21,1, '2024-08-01', '2024-08-15', '2024-08-15', 'Returned'),
(6,  22,1, '2024-08-02', '2024-08-16', '2024-08-20', 'Returned'),
(9,  23,2, '2024-08-03', '2024-08-17', '2024-08-17', 'Returned'),
(12, 24,2, '2024-08-04', '2024-08-18', NULL,          'Overdue'),
(15, 25,3, '2024-08-05', '2024-08-19', '2024-08-25', 'Returned'),
(18, 26,3, '2024-08-06', '2024-08-20', '2024-08-20', 'Returned'),
(21, 27,4, '2024-08-07', '2024-08-21', '2024-08-28', 'Returned'),
(24, 28,4, '2024-08-08', '2024-08-22', '2024-08-22', 'Returned'),
(27, 29,5, '2024-08-09', '2024-08-23', NULL,          'Overdue'),
(30, 30,5, '2024-08-10', '2024-08-24', '2024-09-01', 'Returned'),
(1,  2, 1, '2024-09-01', '2024-09-15', '2024-09-15', 'Returned'),
(4,  4, 2, '2024-09-02', '2024-09-16', '2024-09-20', 'Returned'),
(7,  6, 3, '2024-09-03', '2024-09-17', '2024-09-17', 'Returned'),
(10, 8, 4, '2024-09-04', '2024-09-18', NULL,          'Overdue'),
(13, 10,5, '2024-09-05', '2024-09-19', '2024-09-19', 'Returned'),
(16, 12,1, '2024-09-06', '2024-09-20', '2024-09-26', 'Returned'),
(19, 14,2, '2024-09-07', '2024-09-21', '2024-09-21', 'Returned'),
(22, 16,3, '2024-09-08', '2024-09-22', NULL,          'Overdue'),
(25, 18,4, '2024-09-09', '2024-09-23', '2024-09-30', 'Returned'),
(28, 20,5, '2024-09-10', '2024-09-24', '2024-09-24', 'Returned');

-- 20 Fine Records
INSERT INTO fines (transaction_id, member_id, fine_amount, paid_status, fine_date) VALUES
(2,  2,  8.00,  'Paid',   '2024-07-21'),
(4,  4,  12.00, 'Paid',   '2024-07-26'),
(7,  7,  16.00, 'Unpaid', '2024-07-31'),
(10, 10, 6.00,  'Paid',   '2024-07-29'),
(12, 12, 10.00, 'Unpaid', '2024-08-02'),
(14, 14, 14.00, 'Paid',   '2024-08-06'),
(17, 17, 6.00,  'Unpaid', '2024-08-05'),
(20, 20, 12.00, 'Paid',   '2024-08-11'),
(22, 22, 8.00,  'Unpaid', '2024-08-21'),
(25, 25, 12.00, 'Paid',   '2024-08-26'),
(27, 27, 14.00, 'Unpaid', '2024-08-29'),
(30, 30, 16.00, 'Paid',   '2024-09-02'),
(32, 4,  8.00,  'Unpaid', '2024-09-21'),
(36, 12, 12.00, 'Paid',   '2024-09-27'),
(39, 18, 14.00, 'Paid',   '2024-10-01'),
(5,  5,  20.00, 'Unpaid', '2024-10-01'),
(9,  9,  22.00, 'Unpaid', '2024-10-01'),
(15, 15, 18.00, 'Unpaid', '2024-10-01'),
(19, 19, 24.00, 'Unpaid', '2024-10-01'),
(24, 24, 10.00, 'Unpaid', '2024-10-01');

--CRUD OPERATIONS


-- A1. Insert a new publisher
INSERT INTO publishers (publisher_name, address, phone, email)
VALUES ('Vikas Publishing House', 'Daryaganj, New Delhi', '011-99887766', 'info@vikaspublishing.com');

-- A2. Insert a new category
INSERT INTO categories (category_name, description)
VALUES ('Artificial Intelligence', 'Machine learning, neural networks, and AI ethics');

-- A3. Insert a new author
INSERT INTO authors (first_name, last_name, email)
VALUES ('Raghu', 'Ramakrishnan', 'raghu.r@db.edu');

-- A4. Insert a new book
INSERT INTO books (title, isbn, publisher_id, category_id, year_published, total_copies)
VALUES ('Database Management Systems', '978-0072465631', 3, 1, 2010, 2);

-- A5. Insert into book_authors
INSERT INTO book_authors (book_id, author_id)
VALUES (51, 26);

-- A6. Insert a new member
INSERT INTO members (first_name, last_name, email, phone, address, membership_date, membership_expiry)
VALUES ('Rahul', 'Mehra', 'rahul.mehra@college.edu', '9988776655', 'EE-55 Vasundhara, Ghaziabad', '2025-01-10', '2027-01-09');

-- A7. Insert a new librarian
INSERT INTO librarians (first_name, last_name, email, phone, hire_date)
VALUES ('Vivek', 'Kumar', 'vivek.kumar@library.edu', '9988123456', '2025-02-01');

-- A8. Insert one new book copy
INSERT INTO book_copies (book_id, book_condition, is_available)
SELECT book_id, 'Good', 1 FROM books WHERE isbn = '978-0072465631';

-- A9. Insert multiple copies
INSERT INTO book_copies (book_id, book_condition, is_available) VALUES
(51, 'Good', 1),
(51, 'Fair', 1);

-- A10. Insert a new issue transaction
INSERT INTO issue_transactions (copy_id, member_id, librarian_id, issue_date, due_date, return_date, status)
VALUES (45, 3, 2, '2024-10-15', '2024-10-29', NULL, 'Issued');

-- A11. Insert a new fine
INSERT INTO fines (transaction_id, member_id, fine_amount, paid_status, fine_date)
VALUES (33, 8, 20.00, 'Unpaid', '2024-09-28');

-- A12. Insert a second new book
INSERT INTO books (title, isbn, publisher_id, category_id, year_published, total_copies)
VALUES ('Introduction to Artificial Intelligence', '978-0134610993', 21, 16, 2020, 2);

-- PART B: UPDATE OPERATIONS

-- B1. Update a publisher's phone number
UPDATE publishers
SET phone = '011-45670000'
WHERE publisher_name = 'Oxford University Press';

-- B2. Update a category description
UPDATE categories
SET description = 'Programming, algorithms, databases, operating systems, and computer networks'
WHERE category_name = 'Computer Science';

-- B3. Update an author's email
UPDATE authors
SET email = 'ef.codd@relational.com'
WHERE first_name = 'E.F.' AND last_name = 'Codd';

-- B4. Correct a book title
UPDATE books
SET title = 'The C++ Programming Language'
WHERE isbn = '978-0321563842';

-- B5. Increase total_copies
UPDATE books
SET total_copies = total_copies + 2
WHERE book_id = 1;

-- B6. Update a member's address
UPDATE members
SET address = 'New Flat, Vaishali Sector 6, Ghaziabad'
WHERE email = 'priya.singh@college.edu';

-- B7. Renew a member's membership
UPDATE members
SET membership_expiry = DATE_ADD(membership_expiry, INTERVAL 1 YEAR)
WHERE member_id = 1;

-- B8. Update a librarian's phone
UPDATE librarians
SET phone = '9865400000'
WHERE email = 'ramesh.nair@library.edu';

-- B9. Update a book copy's condition
UPDATE book_copies
SET book_condition = 'Fair'
WHERE copy_id = 1;

-- B10. Mark a copy as unavailable
UPDATE book_copies
SET is_available = 0
WHERE copy_id = 45;

-- B11. Process return
UPDATE issue_transactions
SET return_date = '2024-10-25', status = 'Returned'
WHERE transaction_id = 41;

-- B12. Mark copy available
UPDATE book_copies
SET is_available = 1
WHERE copy_id = 45;

-- B13. Mark a fine as paid
UPDATE fines
SET paid_status = 'Paid'
WHERE fine_id = 3;

-- B14. Extend membership for expired members
UPDATE members
SET membership_expiry = DATE_ADD(membership_expiry, INTERVAL 1 YEAR)
WHERE membership_expiry < '2025-06-01';

-- PART C: DELETE OPERATIONS

-- C1. Delete an incorrect fine record
DELETE FROM fines
WHERE fine_id = 20;

-- C2. Delete an incorrect book-author association
DELETE FROM book_authors
WHERE book_id = 25 AND author_id = 22;

-- C3. Delete a category
DELETE FROM categories
WHERE category_name = 'Law';

-- C4. Delete a publisher
DELETE FROM publishers
WHERE publisher_name = 'Notion Press';

-- C5. Delete an author
DELETE FROM authors
WHERE first_name = 'Arun' AND last_name = 'Sharma';

-- C6. Delete a book copy
DELETE FROM book_copies
WHERE copy_id = 49;

-- C7. Delete the librarian
DELETE FROM librarians
WHERE email = 'vivek.kumar@library.edu';

-- C8. Delete the member
DELETE FROM members
WHERE email = 'rahul.mehra@college.edu';

-- C9. Delete a book safely
DELETE FROM book_authors WHERE book_id = 30;
DELETE FROM books WHERE book_id = 30;

-- C10. Delete a transaction safely
DELETE FROM fines WHERE transaction_id = 2;
DELETE FROM issue_transactions WHERE transaction_id = 2;

-- C11. Bulk delete old paid fines
DELETE FROM fines
WHERE paid_status = 'Paid' AND fine_date < '2024-08-01';

-- C12. Delete oldest unpaid fine
DELETE FROM fines
WHERE member_id = 19
ORDER BY fine_date ASC
LIMIT 1;

-- PART D: SELECT OPERATIONS (READ)

-- D1. View all books
SELECT * FROM books;

-- D2. Recently published books
SELECT title, isbn, year_published
FROM books
WHERE year_published >= 2015;

-- D3. Members living in Ghaziabad
SELECT first_name, last_name, email
FROM members
WHERE address LIKE '%Ghaziabad%';

-- D4. Available book copies
SELECT * FROM book_copies
WHERE is_available = 1;

-- D5. Overdue transactions
SELECT * FROM issue_transactions
WHERE status = 'Overdue';

-- D6. Unpaid fines
SELECT * FROM fines
WHERE paid_status = 'Unpaid';

-- D7. Members sorted by join date
SELECT first_name, last_name, membership_date
FROM members
ORDER BY membership_date DESC;

-- D8. 5 most recent transactions
SELECT * FROM issue_transactions
ORDER BY issue_date DESC
LIMIT 5;

-- D9. Distinct copy conditions
SELECT DISTINCT book_condition FROM book_copies;

-- D10. Books with 3+ copies
SELECT title, total_copies
FROM books
WHERE total_copies >= 3;

-- D11. Members with expiring membership in 2025
SELECT first_name, last_name, membership_expiry
FROM members
WHERE membership_expiry BETWEEN '2025-01-01' AND '2025-12-31';

-- D12. Librarians hired before 2020
SELECT first_name, last_name, hire_date
FROM librarians
WHERE hire_date < '2020-01-01';

-- SQL QUERIES - JOIN, NESTED, AGGREGATE, GROUP BY

-- Q01. List all books with their publisher names
SELECT b.book_id, b.title, b.isbn, b.year_published, p.publisher_name
FROM books b
JOIN publishers p ON b.publisher_id = p.publisher_id
ORDER BY b.book_id;

-- Q02. List all books with their category names
SELECT b.book_id, b.title, c.category_name
FROM books b
JOIN categories c ON b.category_id = c.category_id
ORDER BY c.category_name, b.title;

-- Q03. List all books with their author names
SELECT b.title, a.first_name, a.last_name
FROM books b
JOIN book_authors ba ON b.book_id = ba.book_id
JOIN authors a ON ba.author_id = a.author_id
ORDER BY b.title, a.last_name;

-- Q04. Currently issued transactions with member and book details
SELECT it.transaction_id,
       CONCAT(m.first_name, ' ', m.last_name) AS member_name,
       b.title AS book_title,
       it.issue_date,
       it.due_date
FROM issue_transactions it
JOIN book_copies bc ON it.copy_id = bc.copy_id
JOIN books b ON bc.book_id = b.book_id
JOIN members m ON it.member_id = m.member_id
WHERE it.status = 'Issued'
ORDER BY it.issue_date;

-- Q05. Overdue transactions
SELECT it.transaction_id,
       CONCAT(m.first_name, ' ', m.last_name) AS member_name,
       m.email,
       b.title AS book_title,
       it.due_date
FROM issue_transactions it
JOIN book_copies bc ON it.copy_id = bc.copy_id
JOIN books b ON bc.book_id = b.book_id
JOIN members m ON it.member_id = m.member_id
WHERE it.status = 'Overdue'
ORDER BY it.due_date;

-- Q06. Fine details
SELECT f.fine_id,
       CONCAT(m.first_name, ' ', m.last_name) AS member_name,
       b.title AS book_title,
       f.fine_amount,
       f.paid_status,
       f.fine_date
FROM fines f
JOIN members m ON f.member_id = m.member_id
JOIN issue_transactions it ON f.transaction_id = it.transaction_id
JOIN book_copies bc ON it.copy_id = bc.copy_id
JOIN books b ON bc.book_id = b.book_id
ORDER BY f.fine_date DESC;

-- Q07. Transactions per librarian
SELECT CONCAT(l.first_name, ' ', l.last_name) AS librarian_name,
       it.transaction_id,
       CONCAT(m.first_name, ' ', m.last_name) AS member_name,
       it.issue_date,
       it.status
FROM issue_transactions it
JOIN librarians l ON it.librarian_id = l.librarian_id
JOIN members m ON it.member_id = m.member_id
ORDER BY librarian_name, it.issue_date;

-- Q08. Available books with copy details
SELECT b.title, b.isbn, bc.copy_id, bc.book_condition
FROM book_copies bc
JOIN books b ON bc.book_id = b.book_id
WHERE bc.is_available = 1
ORDER BY b.title;

-- Q09. Returned transactions with return status
SELECT it.transaction_id,
       CONCAT(m.first_name, ' ', m.last_name) AS member_name,
       b.title AS book_title,
       it.due_date,
       it.return_date,
       CASE
           WHEN it.return_date <= it.due_date THEN 'On Time'
           ELSE 'Late'
       END AS return_status
FROM issue_transactions it
JOIN book_copies bc ON it.copy_id = bc.copy_id
JOIN books b ON bc.book_id = b.book_id
JOIN members m ON it.member_id = m.member_id
WHERE it.status = 'Returned'
ORDER BY it.return_date DESC;

-- Q10. Books with copy availability
SELECT b.title,
       b.total_copies,
       SUM(bc.is_available) AS available_copies,
       (b.total_copies - SUM(bc.is_available)) AS issued_copies
FROM books b
JOIN book_copies bc ON b.book_id = bc.book_id
GROUP BY b.book_id, b.title, b.total_copies
ORDER BY b.title;

-- Q21. Total number of books
SELECT COUNT(*) AS total_books FROM books;

-- Q22. Total number of members
SELECT COUNT(*) AS total_members FROM members;

-- Q23. Total book copies
SELECT COUNT(*) AS total_copies FROM book_copies;

-- Q24. Fine statistics
SELECT
    COUNT(*) AS total_fines,
    SUM(fine_amount) AS total_collected,
    AVG(fine_amount) AS avg_fine,
    MIN(fine_amount) AS min_fine,
    MAX(fine_amount) AS max_fine
FROM fines;

-- Q31. Books per category
SELECT c.category_name, COUNT(b.book_id) AS book_count
FROM categories c
LEFT JOIN books b ON c.category_id = b.category_id
GROUP BY c.category_id, c.category_name
ORDER BY book_count DESC;

-- Q33. Transactions per member
SELECT CONCAT(m.first_name, ' ', m.last_name) AS member_name,
       COUNT(it.transaction_id) AS total_borrowings
FROM members m
LEFT JOIN issue_transactions it ON m.member_id = it.member_id
GROUP BY m.member_id, member_name
ORDER BY total_borrowings DESC;

--  VIEWS

-- VIEW 1: Available books
CREATE OR REPLACE VIEW available_books_view AS
SELECT
    bc.copy_id,
    b.book_id,
    b.title,
    b.isbn,
    p.publisher_name,
    c.category_name,
    bc.book_condition
FROM book_copies bc
JOIN books b ON bc.book_id = b.book_id
JOIN publishers p ON b.publisher_id = p.publisher_id
JOIN categories c ON b.category_id = c.category_id
WHERE bc.is_available = 1;

-- VIEW 2: Issued books
CREATE OR REPLACE VIEW issued_books_view AS
SELECT
    it.transaction_id,
    b.title AS book_title,
    bc.copy_id,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    m.email AS member_email,
    CONCAT(l.first_name, ' ', l.last_name) AS issued_by,
    it.issue_date,
    it.due_date
FROM issue_transactions it
JOIN book_copies bc ON it.copy_id = bc.copy_id
JOIN books b ON bc.book_id = b.book_id
JOIN members m ON it.member_id = m.member_id
JOIN librarians l ON it.librarian_id = l.librarian_id
WHERE it.status = 'Issued';

-- VIEW 3: Returned books
CREATE OR REPLACE VIEW returned_books_view AS
SELECT
    it.transaction_id,
    b.title AS book_title,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    it.issue_date,
    it.due_date,
    it.return_date,
    CASE
        WHEN it.return_date <= it.due_date THEN 'On Time'
        ELSE 'Late'
    END AS return_status,
    GREATEST(0, DATEDIFF(it.return_date, it.due_date)) AS days_late
FROM issue_transactions it
JOIN book_copies bc ON it.copy_id = bc.copy_id
JOIN books b ON bc.book_id = b.book_id
JOIN members m ON it.member_id = m.member_id
WHERE it.status = 'Returned';

-- VIEW 4: Overdue books
CREATE OR REPLACE VIEW overdue_books_view AS
SELECT
    it.transaction_id,
    b.title AS book_title,
    bc.copy_id,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    m.phone AS member_phone,
    m.email AS member_email,
    it.issue_date,
    it.due_date,
    DATEDIFF(CURDATE(), it.due_date) AS days_overdue,
    DATEDIFF(CURDATE(), it.due_date) * 2 AS estimated_fine_rs
FROM issue_transactions it
JOIN book_copies bc ON it.copy_id = bc.copy_id
JOIN books b ON bc.book_id = b.book_id
JOIN members m ON it.member_id = m.member_id
WHERE it.status = 'Overdue';

-- VIEW 5: Fine summary
CREATE OR REPLACE VIEW fine_summary_view AS
SELECT
    f.fine_id,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    m.email AS member_email,
    b.title AS book_title,
    it.due_date,
    it.return_date,
    f.fine_amount,
    f.paid_status,
    f.fine_date
FROM fines f
JOIN members m ON f.member_id = m.member_id
JOIN issue_transactions it ON f.transaction_id = it.transaction_id
JOIN book_copies bc ON it.copy_id = bc.copy_id
JOIN books b ON bc.book_id = b.book_id;

-- VIEW 6: Member borrowing summary
CREATE OR REPLACE VIEW member_borrowing_summary_view AS
SELECT
    m.member_id,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    m.email,
    m.membership_expiry,
    COUNT(DISTINCT it.transaction_id) AS total_transactions,
    SUM(CASE WHEN it.status = 'Overdue' THEN 1 ELSE 0 END) AS overdue_count,
    SUM(CASE WHEN it.status = 'Returned' THEN 1 ELSE 0 END) AS returned_count,
    COALESCE(SUM(f.fine_amount), 0) AS total_fines_raised,
    COALESCE(SUM(CASE WHEN f.paid_status = 'Unpaid' THEN f.fine_amount ELSE 0 END), 0) AS unpaid_fines
FROM members m
LEFT JOIN issue_transactions it ON m.member_id = it.member_id
LEFT JOIN fines f ON m.member_id = f.member_id
GROUP BY m.member_id, member_name, m.email, m.membership_expiry;

-- VIEW 7: Publisher book count
CREATE OR REPLACE VIEW publisher_book_count_view AS
SELECT
    p.publisher_id,
    p.publisher_name,
    p.phone,
    p.email AS publisher_email,
    COUNT(DISTINCT b.book_id) AS total_titles,
    COALESCE(SUM(b.total_copies), 0) AS total_copies
FROM publishers p
LEFT JOIN books b ON p.publisher_id = b.publisher_id
GROUP BY p.publisher_id, p.publisher_name, p.phone, publisher_email;

-- VIEW 8: Category book count
CREATE OR REPLACE VIEW category_book_count_view AS
SELECT
    c.category_id,
    c.category_name,
    c.description,
    COUNT(DISTINCT b.book_id) AS total_titles,
    COALESCE(SUM(b.total_copies), 0) AS total_copies
FROM categories c
LEFT JOIN books b ON c.category_id = b.category_id
GROUP BY c.category_id, c.category_name, c.description;

-- VIEW 9: Librarian transactions
CREATE OR REPLACE VIEW librarian_transaction_view AS
SELECT
    l.librarian_id,
    CONCAT(l.first_name, ' ', l.last_name) AS librarian_name,
    l.email,
    l.hire_date,
    COUNT(it.transaction_id) AS total_transactions,
    SUM(CASE WHEN it.status = 'Issued' THEN 1 ELSE 0 END) AS currently_issued,
    SUM(CASE WHEN it.status = 'Returned' THEN 1 ELSE 0 END) AS returned,
    SUM(CASE WHEN it.status = 'Overdue' THEN 1 ELSE 0 END) AS overdue
FROM librarians l
LEFT JOIN issue_transactions it ON l.librarian_id = it.librarian_id
GROUP BY l.librarian_id, librarian_name, l.email, l.hire_date;

-- VIEW 10: Active members
CREATE OR REPLACE VIEW active_members_view AS
SELECT
    m.member_id,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    m.email,
    m.phone,
    m.membership_expiry,
    COUNT(it.transaction_id) AS active_borrowings
FROM members m
JOIN issue_transactions it ON m.member_id = it.member_id
WHERE m.membership_expiry >= CURDATE()
  AND it.status IN ('Issued', 'Overdue')
GROUP BY m.member_id, member_name, m.email, m.phone, m.membership_expiry;
