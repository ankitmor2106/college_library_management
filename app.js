/**
 * app.js — College Library Management System
 * ─────────────────────────────────────────────────────────────────────────
 * COMBINED BUNDLE. This single file replaces the following 22 source files,
 * which were merged to cut down on HTTP requests / module-graph complexity:
 *   helpers.js, db.js, dataHelpers.js, storage.js, modal.js, table.js,
 *   emptyStates.js, loadingStates.js, router.js, themeManager.js,
 *   responsive-navigation.js, crudPage.js, dashboard.js, books.js,
 *   authors.js, publishers.js, categories.js, copies.js, members.js,
 *   librarians.js, transactions.js, fines.js, reports.js
 *
 * index.html is unchanged — it already loads <script type="module" src="app.js">.
 * mysqlAdapter.js is left as a separate, optional file (future backend wiring);
 * it isn't imported anywhere in the running app, so it wasn't merged in.
 *
 * BUGS FIXED DURING THE MERGE (see inline "BUGFIX" comments for detail):
 *   1. books.js leaked an internal `_author_ids` field into the permanent
 *      book record on every save (it was never stripped before being
 *      written into the in-memory table / localStorage snapshot).
 *   2. crudPage.js produced wrong singular labels ("Categorie", "Book Copie")
 *      because it just stripped a trailing "s". Replaced with a real
 *      singularize() helper.
 *   3. Issuing a book let the librarian set status to Returned/Overdue at
 *      creation time (with no return_date), leaving an inconsistent record.
 *      The status field is now removed from the Issue form — new
 *      transactions are always created as 'Issued'.
 *   4. Issuing a book never checked the member's membership_expiry, even
 *      though that's a documented project assumption. Added a check.
 *   5. Members form allowed membership_expiry <= membership_date. Added
 *      cross-field validation.
 *   6. modal.js validated `required` but ignored each field's min/max for
 *      number inputs. Added min/max validation.
 *   7. helpers.js shadowed the name `db` as a local variable inside
 *      daysBetween() — harmless while files were separate, but a real bug
 *      once merged into one shared scope with the db.js data store.
 *   8. Removed several no-op dead-code blocks (e.g. a `.forEach(() => {})`
 *      in books.js afterDelete).
 *   9. Module-scope name collisions introduced purely by the merge
 *      (multiple top-level `FIELDS` / `COLUMNS` / `resolvedFields` /
 *      `memberOptions` / `librarianOptions` constants across former files)
 *      were resolved by giving each page its own uniquely-named constants,
 *      and by sharing one copy of `memberOptions()` / `librarianOptions()`
 *      instead of two duplicate definitions.
 * ─────────────────────────────────────────────────────────────────────────
 */

/* ════════════════════════════════════════════════════════════════════════
   SECTION: helpers.js — Pure utility functions. No external dependencies.
   ════════════════════════════════════════════════════════════════════════ */

/** Format a date string (YYYY-MM-DD) to locale display format. */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Return today's date as YYYY-MM-DD */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Add N days to a YYYY-MM-DD string; returns YYYY-MM-DD */
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Days between two YYYY-MM-DD strings (b - a). Positive = b is later. */
function daysBetween(a, b) {
  const dateA = new Date(a + 'T00:00:00');
  // BUGFIX (#7): this local was previously named `db`, shadowing the
  // global in-memory database object once all modules share one scope.
  const dateB = new Date(b + 'T00:00:00');
  return Math.round((dateB - dateA) / 86400000);
}

/** Format a number as Indian Rupees */
function formatRupees(amount) {
  const n = Number(amount);
  if (isNaN(n)) return '₹0.00';
  return '₹' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Capitalise first letter of each word */
function titleCase(str) {
  if (!str) return '';
  return String(str).replace(/\b\w/g, c => c.toUpperCase());
}

/** Escape HTML special characters */
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Simple debounce */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Clamp a number between min and max */
function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

/** Generate a toast notification */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-dot"></div>
    <span class="toast__msg">${escHtml(message)}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/** Validate a basic email format */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate a 10-digit Indian phone number */
function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ''));
}

/** Deep-clone an object via JSON */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** Pick specific keys from an object */
function pick(obj, keys) {
  return keys.reduce((acc, k) => { if (k in obj) acc[k] = obj[k]; return acc; }, {});
}

/** Sort an array of objects by a key */
function sortBy(arr, key, dir = 'asc') {
  return [...arr].sort((a, b) => {
    const va = a[key] ?? '';
    const vb = b[key] ?? '';
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

/** Filter array with a query string across all string fields */
function filterByQuery(arr, query) {
  if (!query) return arr;
  const q = query.toLowerCase();
  return arr.filter(row =>
    Object.values(row).some(v => v != null && String(v).toLowerCase().includes(q))
  );
}

/** Paginate an array */
function paginate(arr, page, perPage) {
  const start = (page - 1) * perPage;
  return arr.slice(start, start + perPage);
}

/** Total pages for pagination */
function totalPages(total, perPage) {
  return Math.max(1, Math.ceil(total / perPage));
}

/** Render badge HTML for common status values */
function statusBadge(status) {
  const map = {
    'Returned': 'badge-success',
    'Issued':   'badge-accent',
    'Overdue':  'badge-danger',
    'Paid':     'badge-success',
    'Unpaid':   'badge-danger',
    'Good':     'badge-success',
    'Fair':     'badge-warning',
    'Poor':     'badge-danger',
    'Active':   'badge-success',
    'Expired':  'badge-danger',
  };
  const cls = map[status] ?? 'badge-muted';
  return `<span class="badge ${cls}">${escHtml(status)}</span>`;
}

/** Availability badge */
function availBadge(isAvailable) {
  return isAvailable
    ? `<span class="badge badge-success">Available</span>`
    : `<span class="badge badge-danger">Issued</span>`;
}

/**
 * BUGFIX (#2): proper English singularization instead of a blind
 * "strip trailing s", which previously turned "Categories" into
 * "Categorie" and "Book Copies" into "Book Copie" in modal titles
 * and toast messages.
 */
function singularize(word) {
  if (/ies$/i.test(word)) return word.replace(/ies$/i, 'y');
  if (/(ses|xes|ches|shes)$/i.test(word)) return word.replace(/es$/i, '');
  if (/s$/i.test(word) && !/ss$/i.test(word)) return word.replace(/s$/i, '');
  return word;
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: db.js — In-memory data store, pre-loaded with sample dataset.
   ════════════════════════════════════════════════════════════════════════ */

const _data = {
  publishers: [
    { publisher_id: 1,  publisher_name: 'Oxford University Press',   address: 'Great Clarendon St, Oxford',     phone: '011-45678901', email: 'info@oup.com' },
    { publisher_id: 2,  publisher_name: 'Pearson Education',         address: 'KG Marg, New Delhi',             phone: '011-23456789', email: 'info@pearson.com' },
    { publisher_id: 3,  publisher_name: 'McGraw-Hill Education',     address: 'Noida, Uttar Pradesh',           phone: '011-34567890', email: 'info@mgh.com' },
    { publisher_id: 4,  publisher_name: 'Tata McGraw-Hill',          address: 'Connaught Place, New Delhi',     phone: '011-56789012', email: 'info@tmh.com' },
    { publisher_id: 5,  publisher_name: 'Wiley India',               address: 'Daryaganj, New Delhi',           phone: '011-67890123', email: 'info@wiley.in' },
    { publisher_id: 6,  publisher_name: 'S. Chand & Company',        address: 'Ramnagar, New Delhi',            phone: '011-78901234', email: 'info@schand.com' },
    { publisher_id: 7,  publisher_name: 'Cengage Learning',          address: 'Mehrauli, New Delhi',            phone: '011-89012345', email: 'info@cengage.com' },
    { publisher_id: 8,  publisher_name: 'Springer India',            address: 'Connaught Place, New Delhi',     phone: '011-90123456', email: 'info@springer.in' },
    { publisher_id: 9,  publisher_name: 'Cambridge University Press',address: 'Shaftesbury Road, Cambridge',    phone: '011-01234567', email: 'info@cup.com' },
    { publisher_id: 10, publisher_name: 'PHI Learning',              address: 'Ansari Road, Daryaganj',         phone: '011-11223344', email: 'info@phi.com' },
    { publisher_id: 11, publisher_name: 'BPB Publications',          address: 'Ansari Road, New Delhi',         phone: '011-22334455', email: 'info@bpb.com' },
    { publisher_id: 12, publisher_name: 'Arihant Publishers',        address: 'Meerut, Uttar Pradesh',          phone: '0121-3456789', email: 'info@arihant.com' },
    { publisher_id: 13, publisher_name: 'Laxmi Publications',        address: 'Ansari Road, New Delhi',         phone: '011-33445566', email: 'info@laxmi.com' },
    { publisher_id: 14, publisher_name: 'Nai Sarak Publications',    address: 'Chandni Chowk, Delhi',           phone: '011-44556677', email: 'info@naisarak.com' },
    { publisher_id: 15, publisher_name: 'Academic Press',            address: 'London, UK',                     phone: '011-55667788', email: 'info@academic.com' },
    { publisher_id: 16, publisher_name: 'Elsevier India',            address: 'Ansari Road, New Delhi',         phone: '011-66778899', email: 'info@elsevier.in' },
    { publisher_id: 17, publisher_name: 'Orient Blackswan',          address: 'Hyderabad, Telangana',           phone: '040-12345678', email: 'info@orientblack.com' },
    { publisher_id: 18, publisher_name: 'Himalaya Publishing',       address: 'Churchgate, Mumbai',             phone: '022-23456789', email: 'info@himalaya.com' },
    { publisher_id: 19, publisher_name: 'New Age International',     address: 'Daryaganj, New Delhi',           phone: '011-77889900', email: 'info@newage.com' },
    { publisher_id: 20, publisher_name: 'Notion Press',              address: 'Anna Nagar, Chennai',            phone: '044-34567890', email: 'info@notion.com' },
  ],

  categories: [
    { category_id: 1,  category_name: 'Computer Science',      description: 'Programming, algorithms, databases, OS' },
    { category_id: 2,  category_name: 'Mathematics',           description: 'Calculus, algebra, statistics, discrete maths' },
    { category_id: 3,  category_name: 'Physics',               description: 'Classical, quantum, and modern physics' },
    { category_id: 4,  category_name: 'Chemistry',             description: 'Organic, inorganic, and physical chemistry' },
    { category_id: 5,  category_name: 'Electronics',           description: 'Circuit theory, digital electronics, microprocessors' },
    { category_id: 6,  category_name: 'Mechanical Engineering',description: 'Thermodynamics, manufacturing, mechanics' },
    { category_id: 7,  category_name: 'Civil Engineering',     description: 'Structures, surveying, fluid mechanics' },
    { category_id: 8,  category_name: 'Literature',            description: 'Fiction, poetry, drama, literary criticism' },
    { category_id: 9,  category_name: 'History',               description: 'Ancient, medieval, modern world history' },
    { category_id: 10, category_name: 'Economics',             description: 'Micro, macro, international economics' },
    { category_id: 11, category_name: 'Management',            description: 'Business management, marketing, HRM' },
    { category_id: 12, category_name: 'Biology',               description: 'Botany, zoology, microbiology, genetics' },
    { category_id: 13, category_name: 'Law',                   description: 'Constitutional, criminal, civil law' },
    { category_id: 14, category_name: 'Psychology',            description: 'Cognitive, social, developmental psychology' },
    { category_id: 15, category_name: 'Environmental Science', description: 'Ecology, pollution, sustainable development' },
  ],

  authors: [
    { author_id: 1,  first_name: 'Abraham',   last_name: 'Silberschatz', email: 'abraham.s@dbbooks.com' },
    { author_id: 2,  first_name: 'Henry',     last_name: 'Korth',        email: 'henry.k@dbbooks.com' },
    { author_id: 3,  first_name: 'Ramez',     last_name: 'Elmasri',      email: 'ramez.e@cs.edu' },
    { author_id: 4,  first_name: 'Shamkant',  last_name: 'Navathe',      email: 'shamkant.n@cs.edu' },
    { author_id: 5,  first_name: 'C.J.',      last_name: 'Date',         email: 'cj.date@relational.com' },
    { author_id: 6,  first_name: 'E.F.',      last_name: 'Codd',         email: null },
    { author_id: 7,  first_name: 'Donald',    last_name: 'Knuth',        email: 'donald.k@taocp.com' },
    { author_id: 8,  first_name: 'Bjarne',    last_name: 'Stroustrup',   email: 'bjarne.s@cpp.com' },
    { author_id: 9,  first_name: 'Dennis',    last_name: 'Ritchie',      email: null },
    { author_id: 10, first_name: 'Brian',     last_name: 'Kernighan',    email: 'brian.k@bell.com' },
    { author_id: 11, first_name: 'Andrew',    last_name: 'Tanenbaum',    email: 'andrew.t@os.com' },
    { author_id: 12, first_name: 'William',   last_name: 'Stallings',    email: 'william.s@os.com' },
    { author_id: 13, first_name: 'Forouzan',  last_name: 'Behrouz',      email: 'behrouz.f@net.com' },
    { author_id: 14, first_name: 'Naresh',    last_name: 'Chauhan',      email: 'naresh.c@ds.com' },
    { author_id: 15, first_name: 'Sartaj',    last_name: 'Sahni',        email: 'sartaj.s@algorithms.com' },
    { author_id: 16, first_name: 'Cormen',    last_name: 'Thomas',       email: 'thomas.c@clrs.com' },
    { author_id: 17, first_name: 'James',     last_name: 'Gosling',      email: 'james.g@java.com' },
    { author_id: 18, first_name: 'Herbert',   last_name: 'Schildt',      email: 'herbert.s@java.com' },
    { author_id: 19, first_name: 'Robert',    last_name: 'Lafore',       email: 'robert.l@oop.com' },
    { author_id: 20, first_name: 'Yashwant',  last_name: 'Kanetkar',     email: 'yashwant.k@c.com' },
    { author_id: 21, first_name: 'Seymour',   last_name: 'Lipschutz',    email: 'seymour.l@math.com' },
    { author_id: 22, first_name: 'H.C.',      last_name: 'Verma',        email: 'hc.verma@physics.com' },
    { author_id: 23, first_name: 'P.K.',      last_name: 'Nag',          email: 'pk.nag@mech.com' },
    { author_id: 24, first_name: 'R.K.',      last_name: 'Rajput',       email: 'rk.rajput@mech.com' },
    { author_id: 25, first_name: 'Arun',      last_name: 'Sharma',       email: 'arun.s@aptitude.com' },
  ],

  books: [
    { book_id: 1,  title: 'Database System Concepts',           isbn: '978-0073523323', publisher_id: 1,  category_id: 1,  year_published: 2019, total_copies: 3 },
    { book_id: 2,  title: 'Fundamentals of Database Systems',   isbn: '978-0133970777', publisher_id: 2,  category_id: 1,  year_published: 2015, total_copies: 2 },
    { book_id: 3,  title: 'An Introduction to Database Systems',isbn: '978-0321197849', publisher_id: 9,  category_id: 1,  year_published: 2003, total_copies: 2 },
    { book_id: 4,  title: 'The Art of Computer Programming',    isbn: '978-0201853926', publisher_id: 1,  category_id: 1,  year_published: 2011, total_copies: 2 },
    { book_id: 5,  title: 'The C Programming Language',         isbn: '978-0131103627', publisher_id: 3,  category_id: 1,  year_published: 1988, total_copies: 3 },
    { book_id: 6,  title: 'C++ Programming Language',           isbn: '978-0321563842', publisher_id: 2,  category_id: 1,  year_published: 2013, total_copies: 2 },
    { book_id: 7,  title: 'Operating System Concepts',          isbn: '978-1118063330', publisher_id: 5,  category_id: 1,  year_published: 2018, total_copies: 3 },
    { book_id: 8,  title: 'Modern Operating Systems',           isbn: '978-0136006633', publisher_id: 2,  category_id: 1,  year_published: 2014, total_copies: 2 },
    { book_id: 9,  title: 'Computer Networks',                  isbn: '978-0132126953', publisher_id: 2,  category_id: 1,  year_published: 2010, total_copies: 2 },
    { book_id: 10, title: 'Data Structures Using C',            isbn: '978-0198066425', publisher_id: 10, category_id: 1,  year_published: 2016, total_copies: 3 },
    { book_id: 11, title: 'Introduction to Algorithms',         isbn: '978-0262033848', publisher_id: 1,  category_id: 1,  year_published: 2009, total_copies: 3 },
    { book_id: 12, title: 'Java: The Complete Reference',       isbn: '978-1260440249', publisher_id: 3,  category_id: 1,  year_published: 2019, total_copies: 2 },
    { book_id: 13, title: 'Let Us C',                           isbn: '978-9387284630', publisher_id: 11, category_id: 1,  year_published: 2020, total_copies: 4 },
    { book_id: 14, title: 'Data Communications & Networking',   isbn: '978-0073376226', publisher_id: 3,  category_id: 1,  year_published: 2012, total_copies: 2 },
    { book_id: 15, title: 'Computer Organization & Design',     isbn: '978-0128017333', publisher_id: 2,  category_id: 1,  year_published: 2017, total_copies: 2 },
    { book_id: 16, title: 'Higher Engineering Mathematics',     isbn: '978-1259062506', publisher_id: 4,  category_id: 2,  year_published: 2014, total_copies: 3 },
    { book_id: 17, title: 'Discrete Mathematics',               isbn: '978-0070681484', publisher_id: 3,  category_id: 2,  year_published: 2016, total_copies: 2 },
    { book_id: 18, title: 'Engineering Mathematics Vol 1',      isbn: '978-8131526286', publisher_id: 7,  category_id: 2,  year_published: 2018, total_copies: 2 },
    { book_id: 19, title: 'Probability and Statistics',         isbn: '978-0070648951', publisher_id: 4,  category_id: 2,  year_published: 2013, total_copies: 2 },
    { book_id: 20, title: 'Linear Algebra and Its Applications',isbn: '978-0321982384', publisher_id: 2,  category_id: 2,  year_published: 2016, total_copies: 2 },
    { book_id: 21, title: 'Concepts of Physics Part 1',         isbn: '978-8177091878', publisher_id: 6,  category_id: 3,  year_published: 2018, total_copies: 3 },
    { book_id: 22, title: 'Concepts of Physics Part 2',         isbn: '978-8177092110', publisher_id: 6,  category_id: 3,  year_published: 2018, total_copies: 3 },
    { book_id: 23, title: 'University Physics',                 isbn: '978-0321501219', publisher_id: 2,  category_id: 3,  year_published: 2015, total_copies: 2 },
    { book_id: 24, title: 'Physics for Scientists & Engineers', isbn: '978-0321570529', publisher_id: 2,  category_id: 3,  year_published: 2013, total_copies: 2 },
    { book_id: 25, title: 'Modern Physics',                     isbn: '978-0077263911', publisher_id: 3,  category_id: 3,  year_published: 2012, total_copies: 2 },
    { book_id: 26, title: 'Organic Chemistry',                  isbn: '978-0198069478', publisher_id: 1,  category_id: 4,  year_published: 2017, total_copies: 2 },
    { book_id: 27, title: 'Physical Chemistry',                 isbn: '978-0198557654', publisher_id: 1,  category_id: 4,  year_published: 2016, total_copies: 2 },
    { book_id: 28, title: 'Inorganic Chemistry',                isbn: '978-0198767602', publisher_id: 1,  category_id: 4,  year_published: 2019, total_copies: 2 },
    { book_id: 29, title: 'Engineering Chemistry',              isbn: '978-8121935654', publisher_id: 13, category_id: 4,  year_published: 2015, total_copies: 3 },
    { book_id: 30, title: 'Atkins Physical Chemistry',          isbn: '978-0198769866', publisher_id: 1,  category_id: 4,  year_published: 2018, total_copies: 2 },
    { book_id: 31, title: 'Electronic Devices & Circuits',      isbn: '978-0070607989', publisher_id: 3,  category_id: 5,  year_published: 2016, total_copies: 3 },
    { book_id: 32, title: 'Digital Electronics',                isbn: '978-8131786543', publisher_id: 4,  category_id: 5,  year_published: 2015, total_copies: 2 },
    { book_id: 33, title: 'Microprocessors & Microcontrollers', isbn: '978-0070667648', publisher_id: 3,  category_id: 5,  year_published: 2017, total_copies: 2 },
    { book_id: 34, title: 'Circuit Theory',                     isbn: '978-8120338593', publisher_id: 10, category_id: 5,  year_published: 2016, total_copies: 2 },
    { book_id: 35, title: 'Analog Electronics',                 isbn: '978-8131776421', publisher_id: 7,  category_id: 5,  year_published: 2014, total_copies: 2 },
    { book_id: 36, title: 'Engineering Thermodynamics',         isbn: '978-0070648760', publisher_id: 3,  category_id: 6,  year_published: 2018, total_copies: 3 },
    { book_id: 37, title: 'Fluid Mechanics',                    isbn: '978-0071333154', publisher_id: 3,  category_id: 6,  year_published: 2015, total_copies: 2 },
    { book_id: 38, title: 'Strength of Materials',              isbn: '978-8121926560', publisher_id: 13, category_id: 6,  year_published: 2016, total_copies: 2 },
    { book_id: 39, title: 'Machine Design',                     isbn: '978-0070324947', publisher_id: 3,  category_id: 6,  year_published: 2014, total_copies: 2 },
    { book_id: 40, title: 'Manufacturing Science',              isbn: '978-8131773352', publisher_id: 7,  category_id: 6,  year_published: 2017, total_copies: 2 },
    { book_id: 41, title: 'RCC Design',                         isbn: '978-8121912110', publisher_id: 13, category_id: 7,  year_published: 2016, total_copies: 2 },
    { book_id: 42, title: 'Fluid Mechanics in Civil Engg',      isbn: '978-8121915625', publisher_id: 13, category_id: 7,  year_published: 2015, total_copies: 2 },
    { book_id: 43, title: 'Surveying Vol 1',                    isbn: '978-8121924627', publisher_id: 13, category_id: 7,  year_published: 2017, total_copies: 2 },
    { book_id: 44, title: 'English Literature Companion',       isbn: '978-0198064589', publisher_id: 1,  category_id: 8,  year_published: 2016, total_copies: 2 },
    { book_id: 45, title: 'Pride and Prejudice',                isbn: '978-0141439518', publisher_id: 9,  category_id: 8,  year_published: 2002, total_copies: 2 },
    { book_id: 46, title: 'World History',                      isbn: '978-0199760039', publisher_id: 1,  category_id: 9,  year_published: 2014, total_copies: 2 },
    { book_id: 47, title: 'Indian History',                     isbn: '978-8125036548', publisher_id: 17, category_id: 9,  year_published: 2018, total_copies: 3 },
    { book_id: 48, title: 'Principles of Economics',            isbn: '978-1337514002', publisher_id: 7,  category_id: 10, year_published: 2018, total_copies: 2 },
    { book_id: 49, title: 'Business Management',                isbn: '978-8120351288', publisher_id: 10, category_id: 11, year_published: 2017, total_copies: 2 },
    { book_id: 50, title: 'Environmental Studies',              isbn: '978-8131522646', publisher_id: 7,  category_id: 15, year_published: 2019, total_copies: 3 },
  ],

  bookAuthors: [
    {book_id:1,author_id:1},{book_id:1,author_id:2},{book_id:2,author_id:3},{book_id:2,author_id:4},
    {book_id:3,author_id:5},{book_id:4,author_id:7},{book_id:5,author_id:9},{book_id:5,author_id:10},
    {book_id:6,author_id:8},{book_id:7,author_id:1},{book_id:8,author_id:11},{book_id:9,author_id:13},
    {book_id:10,author_id:14},{book_id:11,author_id:16},{book_id:12,author_id:18},{book_id:13,author_id:20},
    {book_id:14,author_id:13},{book_id:15,author_id:1},{book_id:16,author_id:21},{book_id:17,author_id:21},
    {book_id:18,author_id:21},{book_id:19,author_id:21},{book_id:20,author_id:21},{book_id:21,author_id:22},
    {book_id:22,author_id:22},{book_id:23,author_id:22},{book_id:24,author_id:22},{book_id:25,author_id:22},
    {book_id:26,author_id:5},{book_id:27,author_id:5},{book_id:28,author_id:5},{book_id:29,author_id:5},
    {book_id:30,author_id:5},{book_id:31,author_id:13},{book_id:32,author_id:13},{book_id:33,author_id:13},
    {book_id:34,author_id:13},{book_id:35,author_id:13},{book_id:36,author_id:23},{book_id:37,author_id:23},
    {book_id:38,author_id:24},{book_id:39,author_id:23},{book_id:40,author_id:24},{book_id:41,author_id:24},
    {book_id:42,author_id:24},{book_id:43,author_id:24},{book_id:44,author_id:1},{book_id:45,author_id:1},
    {book_id:46,author_id:1},{book_id:47,author_id:1},{book_id:48,author_id:1},{book_id:49,author_id:1},
    {book_id:50,author_id:1},
  ],

  members: [
    { member_id: 1,  first_name: 'Aarav',    last_name: 'Sharma',     email: 'aarav.sharma@college.edu',    phone: '9876543210', address: 'A-12 Raj Nagar, Ghaziabad',        membership_date: '2023-06-01', membership_expiry: '2025-05-31' },
    { member_id: 2,  first_name: 'Priya',    last_name: 'Singh',      email: 'priya.singh@college.edu',     phone: '9865432109', address: 'B-34 Indirapuram, Ghaziabad',       membership_date: '2023-06-01', membership_expiry: '2025-05-31' },
    { member_id: 3,  first_name: 'Rohan',    last_name: 'Verma',      email: 'rohan.verma@college.edu',     phone: '9854321098', address: 'C-56 Vaishali, Ghaziabad',          membership_date: '2023-07-01', membership_expiry: '2025-06-30' },
    { member_id: 4,  first_name: 'Sneha',    last_name: 'Gupta',      email: 'sneha.gupta@college.edu',     phone: '9843210987', address: 'D-78 Kaushambi, Ghaziabad',         membership_date: '2023-07-15', membership_expiry: '2025-07-14' },
    { member_id: 5,  first_name: 'Amit',     last_name: 'Yadav',      email: 'amit.yadav@college.edu',      phone: '9832109876', address: 'E-90 Crossing Republik',             membership_date: '2023-08-01', membership_expiry: '2025-07-31' },
    { member_id: 6,  first_name: 'Kavya',    last_name: 'Patel',      email: 'kavya.patel@college.edu',     phone: '9821098765', address: 'F-11 Sanjay Nagar, Ghaziabad',      membership_date: '2023-08-15', membership_expiry: '2025-08-14' },
    { member_id: 7,  first_name: 'Vikram',   last_name: 'Rao',        email: 'vikram.rao@college.edu',      phone: '9810987654', address: 'G-22 Raj Nagar Extn',               membership_date: '2023-09-01', membership_expiry: '2025-08-31' },
    { member_id: 8,  first_name: 'Ananya',   last_name: 'Mehta',      email: 'ananya.mehta@college.edu',    phone: '9809876543', address: 'H-33 Shakti Khand',                 membership_date: '2023-09-15', membership_expiry: '2025-09-14' },
    { member_id: 9,  first_name: 'Rajesh',   last_name: 'Kumar',      email: 'rajesh.kumar@college.edu',    phone: '9798765432', address: 'I-44 Nyay Khand',                   membership_date: '2023-10-01', membership_expiry: '2025-09-30' },
    { member_id: 10, first_name: 'Pooja',    last_name: 'Mishra',     email: 'pooja.mishra@college.edu',    phone: '9787654321', address: 'J-55 Ahinsa Khand',                 membership_date: '2023-10-15', membership_expiry: '2025-10-14' },
    { member_id: 11, first_name: 'Suresh',   last_name: 'Pandey',     email: 'suresh.pandey@college.edu',   phone: '9776543210', address: 'K-66 Vasundhara, Ghaziabad',        membership_date: '2023-11-01', membership_expiry: '2025-10-31' },
    { member_id: 12, first_name: 'Nisha',    last_name: 'Tiwari',     email: 'nisha.tiwari@college.edu',    phone: '9765432109', address: 'L-77 Sahibabad, Ghaziabad',         membership_date: '2023-11-15', membership_expiry: '2025-11-14' },
    { member_id: 13, first_name: 'Deepak',   last_name: 'Joshi',      email: 'deepak.joshi@college.edu',    phone: '9754321098', address: 'M-88 Mohan Nagar',                  membership_date: '2023-12-01', membership_expiry: '2025-11-30' },
    { member_id: 14, first_name: 'Ritu',     last_name: 'Agarwal',    email: 'ritu.agarwal@college.edu',    phone: '9743210987', address: 'N-99 Dilshad Garden',               membership_date: '2023-12-15', membership_expiry: '2025-12-14' },
    { member_id: 15, first_name: 'Arjun',    last_name: 'Chauhan',    email: 'arjun.chauhan@college.edu',   phone: '9732109876', address: 'O-10 Loni, Ghaziabad',              membership_date: '2024-01-01', membership_expiry: '2026-12-31' },
    { member_id: 16, first_name: 'Divya',    last_name: 'Srivastava', email: 'divya.sri@college.edu',       phone: '9721098765', address: 'P-21 Hindon Village',               membership_date: '2024-01-15', membership_expiry: '2026-01-14' },
    { member_id: 17, first_name: 'Manish',   last_name: 'Dubey',      email: 'manish.dubey@college.edu',    phone: '9710987654', address: 'Q-32 Govindpuram',                  membership_date: '2024-02-01', membership_expiry: '2026-01-31' },
    { member_id: 18, first_name: 'Sakshi',   last_name: 'Shukla',     email: 'sakshi.shukla@college.edu',   phone: '9709876543', address: 'R-43 Pratap Vihar',                 membership_date: '2024-02-15', membership_expiry: '2026-02-14' },
    { member_id: 19, first_name: 'Ankur',    last_name: 'Tripathi',   email: 'ankur.tri@college.edu',       phone: '9698765432', address: 'S-54 Gandhi Nagar',                 membership_date: '2024-03-01', membership_expiry: '2026-02-28' },
    { member_id: 20, first_name: 'Swati',    last_name: 'Goel',       email: 'swati.goel@college.edu',      phone: '9687654321', address: 'T-65 Niti Khand',                   membership_date: '2024-03-15', membership_expiry: '2026-03-14' },
    { member_id: 21, first_name: 'Rahul',    last_name: 'Saxena',     email: 'rahul.saxena@college.edu',    phone: '9676543210', address: 'U-76 Sector 4 Vaishali',            membership_date: '2024-04-01', membership_expiry: '2026-03-31' },
    { member_id: 22, first_name: 'Priyanka', last_name: 'Bhatt',      email: 'priyanka.bhatt@college.edu',  phone: '9665432109', address: 'V-87 Sector 5 Vaishali',            membership_date: '2024-04-15', membership_expiry: '2026-04-14' },
    { member_id: 23, first_name: 'Saurabh',  last_name: 'Singh',      email: 'saurabh.singh@college.edu',   phone: '9654321098', address: 'W-98 Indirapuram',                  membership_date: '2024-05-01', membership_expiry: '2026-04-30' },
    { member_id: 24, first_name: 'Megha',    last_name: 'Kapoor',     email: 'megha.kapoor@college.edu',    phone: '9643210987', address: 'X-09 Kaushambi',                    membership_date: '2024-05-15', membership_expiry: '2026-05-14' },
    { member_id: 25, first_name: 'Nitin',    last_name: 'Bhardwaj',   email: 'nitin.bh@college.edu',        phone: '9632109876', address: 'Y-11 Raj Nagar',                    membership_date: '2024-06-01', membership_expiry: '2026-05-31' },
    { member_id: 26, first_name: 'Komal',    last_name: 'Yadav',      email: 'komal.yadav@college.edu',     phone: '9621098765', address: 'Z-22 Crossings Republik',           membership_date: '2024-06-15', membership_expiry: '2026-06-14' },
    { member_id: 27, first_name: 'Harshit',  last_name: 'Rawat',      email: 'harshit.rawat@college.edu',   phone: '9610987654', address: 'AA-33 Sanjay Nagar',                membership_date: '2024-07-01', membership_expiry: '2026-06-30' },
    { member_id: 28, first_name: 'Tanvi',    last_name: 'Singh',      email: 'tanvi.singh@college.edu',     phone: '9609876543', address: 'BB-44 Shakti Khand',                membership_date: '2024-07-15', membership_expiry: '2026-07-14' },
    { member_id: 29, first_name: 'Kunal',    last_name: 'Pathak',     email: 'kunal.pathak@college.edu',    phone: '9598765432', address: 'CC-55 Nyay Khand',                  membership_date: '2024-08-01', membership_expiry: '2026-07-31' },
    { member_id: 30, first_name: 'Neha',     last_name: 'Dixit',      email: 'neha.dixit@college.edu',      phone: '9587654321', address: 'DD-66 Sector 62, Noida',            membership_date: '2024-08-15', membership_expiry: '2026-08-14' },
  ],

  librarians: [
    { librarian_id: 1, first_name: 'Sunita', last_name: 'Devi',     email: 'sunita.devi@library.edu',    phone: '9876512340', hire_date: '2018-04-01' },
    { librarian_id: 2, first_name: 'Ramesh', last_name: 'Nair',     email: 'ramesh.nair@library.edu',    phone: '9865423410', hire_date: '2019-06-15' },
    { librarian_id: 3, first_name: 'Geeta',  last_name: 'Bajaj',    email: 'geeta.bajaj@library.edu',    phone: '9854234560', hire_date: '2020-01-10' },
    { librarian_id: 4, first_name: 'Anil',   last_name: 'Sharma',   email: 'anil.sharma@library.edu',    phone: '9843123450', hire_date: '2021-07-20' },
    { librarian_id: 5, first_name: 'Priti',  last_name: 'Malhotra', email: 'priti.malhotra@library.edu', phone: '9832012340', hire_date: '2022-03-05' },
  ],

  copies: [
    { copy_id: 1,  book_id: 1,  book_condition: 'Good', is_available: 1 },
    { copy_id: 2,  book_id: 1,  book_condition: 'Good', is_available: 1 },
    { copy_id: 3,  book_id: 1,  book_condition: 'Fair', is_available: 1 },
    { copy_id: 4,  book_id: 2,  book_condition: 'Good', is_available: 1 },
    { copy_id: 5,  book_id: 2,  book_condition: 'Good', is_available: 1 },
    { copy_id: 6,  book_id: 3,  book_condition: 'Good', is_available: 1 },
    { copy_id: 7,  book_id: 3,  book_condition: 'Fair', is_available: 1 },
    { copy_id: 8,  book_id: 4,  book_condition: 'Good', is_available: 1 },
    { copy_id: 9,  book_id: 4,  book_condition: 'Good', is_available: 1 },
    { copy_id: 10, book_id: 5,  book_condition: 'Good', is_available: 0 },
    { copy_id: 11, book_id: 5,  book_condition: 'Good', is_available: 1 },
    { copy_id: 12, book_id: 5,  book_condition: 'Fair', is_available: 0 },
    { copy_id: 13, book_id: 6,  book_condition: 'Good', is_available: 0 },
    { copy_id: 14, book_id: 6,  book_condition: 'Good', is_available: 0 },
    { copy_id: 15, book_id: 7,  book_condition: 'Good', is_available: 1 },
    { copy_id: 16, book_id: 7,  book_condition: 'Good', is_available: 1 },
    { copy_id: 17, book_id: 7,  book_condition: 'Fair', is_available: 1 },
    { copy_id: 18, book_id: 8,  book_condition: 'Good', is_available: 1 },
    { copy_id: 19, book_id: 8,  book_condition: 'Good', is_available: 1 },
    { copy_id: 20, book_id: 9,  book_condition: 'Good', is_available: 1 },
    { copy_id: 21, book_id: 9,  book_condition: 'Good', is_available: 1 },
    { copy_id: 22, book_id: 10, book_condition: 'Good', is_available: 0 },
    { copy_id: 23, book_id: 10, book_condition: 'Good', is_available: 1 },
    { copy_id: 24, book_id: 10, book_condition: 'Fair', is_available: 1 },
    { copy_id: 25, book_id: 11, book_condition: 'Good', is_available: 0 },
    { copy_id: 26, book_id: 11, book_condition: 'Good', is_available: 0 },
    { copy_id: 27, book_id: 11, book_condition: 'Fair', is_available: 0 },
    { copy_id: 28, book_id: 12, book_condition: 'Good', is_available: 1 },
    { copy_id: 29, book_id: 12, book_condition: 'Good', is_available: 1 },
    { copy_id: 30, book_id: 13, book_condition: 'Good', is_available: 1 },
    { copy_id: 31, book_id: 13, book_condition: 'Good', is_available: 1 },
    { copy_id: 32, book_id: 13, book_condition: 'Good', is_available: 1 },
    { copy_id: 33, book_id: 13, book_condition: 'Fair', is_available: 1 },
    { copy_id: 34, book_id: 14, book_condition: 'Good', is_available: 1 },
    { copy_id: 35, book_id: 14, book_condition: 'Fair', is_available: 1 },
    { copy_id: 36, book_id: 15, book_condition: 'Good', is_available: 1 },
    { copy_id: 37, book_id: 15, book_condition: 'Good', is_available: 1 },
    { copy_id: 38, book_id: 16, book_condition: 'Good', is_available: 1 },
    { copy_id: 39, book_id: 16, book_condition: 'Good', is_available: 1 },
    { copy_id: 40, book_id: 16, book_condition: 'Fair', is_available: 1 },
    { copy_id: 41, book_id: 17, book_condition: 'Good', is_available: 1 },
    { copy_id: 42, book_id: 17, book_condition: 'Good', is_available: 1 },
    { copy_id: 43, book_id: 21, book_condition: 'Good', is_available: 1 },
    { copy_id: 44, book_id: 21, book_condition: 'Good', is_available: 1 },
    { copy_id: 45, book_id: 21, book_condition: 'Fair', is_available: 1 },
    { copy_id: 46, book_id: 22, book_condition: 'Good', is_available: 1 },
    { copy_id: 47, book_id: 22, book_condition: 'Good', is_available: 1 },
    { copy_id: 48, book_id: 31, book_condition: 'Good', is_available: 1 },
    { copy_id: 49, book_id: 31, book_condition: 'Good', is_available: 1 },
  ],

  transactions: [
    { transaction_id: 1,  copy_id: 1,  member_id: 1,  librarian_id: 1, issue_date: '2024-07-01', due_date: '2024-07-15', return_date: '2024-07-14', status: 'Returned' },
    { transaction_id: 2,  copy_id: 4,  member_id: 2,  librarian_id: 1, issue_date: '2024-07-02', due_date: '2024-07-16', return_date: '2024-07-20', status: 'Returned' },
    { transaction_id: 3,  copy_id: 7,  member_id: 3,  librarian_id: 2, issue_date: '2024-07-03', due_date: '2024-07-17', return_date: '2024-07-17', status: 'Returned' },
    { transaction_id: 4,  copy_id: 10, member_id: 4,  librarian_id: 2, issue_date: '2024-07-05', due_date: '2024-07-19', return_date: '2024-07-25', status: 'Returned' },
    { transaction_id: 5,  copy_id: 13, member_id: 5,  librarian_id: 3, issue_date: '2024-07-06', due_date: '2024-07-20', return_date: null,          status: 'Overdue' },
    { transaction_id: 6,  copy_id: 16, member_id: 6,  librarian_id: 3, issue_date: '2024-07-07', due_date: '2024-07-21', return_date: '2024-07-21', status: 'Returned' },
    { transaction_id: 7,  copy_id: 19, member_id: 7,  librarian_id: 4, issue_date: '2024-07-08', due_date: '2024-07-22', return_date: '2024-07-30', status: 'Returned' },
    { transaction_id: 8,  copy_id: 22, member_id: 8,  librarian_id: 4, issue_date: '2024-07-09', due_date: '2024-07-23', return_date: '2024-07-23', status: 'Returned' },
    { transaction_id: 9,  copy_id: 25, member_id: 9,  librarian_id: 5, issue_date: '2024-07-10', due_date: '2024-07-24', return_date: null,          status: 'Overdue' },
    { transaction_id: 10, copy_id: 28, member_id: 10, librarian_id: 5, issue_date: '2024-07-11', due_date: '2024-07-25', return_date: '2024-07-28', status: 'Returned' },
    { transaction_id: 11, copy_id: 2,  member_id: 11, librarian_id: 1, issue_date: '2024-07-12', due_date: '2024-07-26', return_date: '2024-07-26', status: 'Returned' },
    { transaction_id: 12, copy_id: 5,  member_id: 12, librarian_id: 1, issue_date: '2024-07-13', due_date: '2024-07-27', return_date: '2024-08-01', status: 'Returned' },
    { transaction_id: 13, copy_id: 8,  member_id: 13, librarian_id: 2, issue_date: '2024-07-14', due_date: '2024-07-28', return_date: '2024-07-28', status: 'Returned' },
    { transaction_id: 14, copy_id: 11, member_id: 14, librarian_id: 2, issue_date: '2024-07-15', due_date: '2024-07-29', return_date: '2024-08-05', status: 'Returned' },
    { transaction_id: 15, copy_id: 14, member_id: 15, librarian_id: 3, issue_date: '2024-07-16', due_date: '2024-07-30', return_date: null,          status: 'Overdue' },
    { transaction_id: 16, copy_id: 17, member_id: 16, librarian_id: 3, issue_date: '2024-07-17', due_date: '2024-07-31', return_date: '2024-07-31', status: 'Returned' },
    { transaction_id: 17, copy_id: 20, member_id: 17, librarian_id: 4, issue_date: '2024-07-18', due_date: '2024-08-01', return_date: '2024-08-04', status: 'Returned' },
    { transaction_id: 18, copy_id: 23, member_id: 18, librarian_id: 4, issue_date: '2024-07-19', due_date: '2024-08-02', return_date: '2024-08-02', status: 'Returned' },
    { transaction_id: 19, copy_id: 26, member_id: 19, librarian_id: 5, issue_date: '2024-07-20', due_date: '2024-08-03', return_date: null,          status: 'Overdue' },
    { transaction_id: 20, copy_id: 29, member_id: 20, librarian_id: 5, issue_date: '2024-07-21', due_date: '2024-08-04', return_date: '2024-08-10', status: 'Returned' },
    { transaction_id: 21, copy_id: 3,  member_id: 21, librarian_id: 1, issue_date: '2024-08-01', due_date: '2024-08-15', return_date: '2024-08-15', status: 'Returned' },
    { transaction_id: 22, copy_id: 6,  member_id: 22, librarian_id: 1, issue_date: '2024-08-02', due_date: '2024-08-16', return_date: '2024-08-20', status: 'Returned' },
    { transaction_id: 23, copy_id: 9,  member_id: 23, librarian_id: 2, issue_date: '2024-08-03', due_date: '2024-08-17', return_date: '2024-08-17', status: 'Returned' },
    { transaction_id: 24, copy_id: 12, member_id: 24, librarian_id: 2, issue_date: '2024-08-04', due_date: '2024-08-18', return_date: null,          status: 'Overdue' },
    { transaction_id: 25, copy_id: 15, member_id: 25, librarian_id: 3, issue_date: '2024-08-05', due_date: '2024-08-19', return_date: '2024-08-25', status: 'Returned' },
    { transaction_id: 26, copy_id: 18, member_id: 26, librarian_id: 3, issue_date: '2024-08-06', due_date: '2024-08-20', return_date: '2024-08-20', status: 'Returned' },
    { transaction_id: 27, copy_id: 21, member_id: 27, librarian_id: 4, issue_date: '2024-08-07', due_date: '2024-08-21', return_date: '2024-08-28', status: 'Returned' },
    { transaction_id: 28, copy_id: 24, member_id: 28, librarian_id: 4, issue_date: '2024-08-08', due_date: '2024-08-22', return_date: '2024-08-22', status: 'Returned' },
    { transaction_id: 29, copy_id: 27, member_id: 29, librarian_id: 5, issue_date: '2024-08-09', due_date: '2024-08-23', return_date: null,          status: 'Overdue' },
    { transaction_id: 30, copy_id: 30, member_id: 30, librarian_id: 5, issue_date: '2024-08-10', due_date: '2024-08-24', return_date: '2024-09-01', status: 'Returned' },
    { transaction_id: 31, copy_id: 1,  member_id: 2,  librarian_id: 1, issue_date: '2024-09-01', due_date: '2024-09-15', return_date: '2024-09-15', status: 'Returned' },
    { transaction_id: 32, copy_id: 4,  member_id: 4,  librarian_id: 2, issue_date: '2024-09-02', due_date: '2024-09-16', return_date: '2024-09-20', status: 'Returned' },
    { transaction_id: 33, copy_id: 7,  member_id: 6,  librarian_id: 3, issue_date: '2024-09-03', due_date: '2024-09-17', return_date: '2024-09-17', status: 'Returned' },
    { transaction_id: 34, copy_id: 10, member_id: 8,  librarian_id: 4, issue_date: '2024-09-04', due_date: '2024-09-18', return_date: null,          status: 'Overdue' },
    { transaction_id: 35, copy_id: 13, member_id: 10, librarian_id: 5, issue_date: '2024-09-05', due_date: '2024-09-19', return_date: '2024-09-19', status: 'Returned' },
    { transaction_id: 36, copy_id: 16, member_id: 12, librarian_id: 1, issue_date: '2024-09-06', due_date: '2024-09-20', return_date: '2024-09-26', status: 'Returned' },
    { transaction_id: 37, copy_id: 19, member_id: 14, librarian_id: 2, issue_date: '2024-09-07', due_date: '2024-09-21', return_date: '2024-09-21', status: 'Returned' },
    { transaction_id: 38, copy_id: 22, member_id: 16, librarian_id: 3, issue_date: '2024-09-08', due_date: '2024-09-22', return_date: null,          status: 'Overdue' },
    { transaction_id: 39, copy_id: 25, member_id: 18, librarian_id: 4, issue_date: '2024-09-09', due_date: '2024-09-23', return_date: '2024-09-30', status: 'Returned' },
    { transaction_id: 40, copy_id: 28, member_id: 20, librarian_id: 5, issue_date: '2024-09-10', due_date: '2024-09-24', return_date: '2024-09-24', status: 'Returned' },
  ],

  fines: [
    { fine_id: 1,  transaction_id: 2,  member_id: 2,  fine_amount: 8.00,  paid_status: 'Paid',   fine_date: '2024-07-21' },
    { fine_id: 2,  transaction_id: 4,  member_id: 4,  fine_amount: 12.00, paid_status: 'Paid',   fine_date: '2024-07-26' },
    { fine_id: 3,  transaction_id: 7,  member_id: 7,  fine_amount: 16.00, paid_status: 'Unpaid', fine_date: '2024-07-31' },
    { fine_id: 4,  transaction_id: 10, member_id: 10, fine_amount: 6.00,  paid_status: 'Paid',   fine_date: '2024-07-29' },
    { fine_id: 5,  transaction_id: 12, member_id: 12, fine_amount: 10.00, paid_status: 'Unpaid', fine_date: '2024-08-02' },
    { fine_id: 6,  transaction_id: 14, member_id: 14, fine_amount: 14.00, paid_status: 'Paid',   fine_date: '2024-08-06' },
    { fine_id: 7,  transaction_id: 17, member_id: 17, fine_amount: 6.00,  paid_status: 'Unpaid', fine_date: '2024-08-05' },
    { fine_id: 8,  transaction_id: 20, member_id: 20, fine_amount: 12.00, paid_status: 'Paid',   fine_date: '2024-08-11' },
    { fine_id: 9,  transaction_id: 22, member_id: 22, fine_amount: 8.00,  paid_status: 'Unpaid', fine_date: '2024-08-21' },
    { fine_id: 10, transaction_id: 25, member_id: 25, fine_amount: 12.00, paid_status: 'Paid',   fine_date: '2024-08-26' },
    { fine_id: 11, transaction_id: 27, member_id: 27, fine_amount: 14.00, paid_status: 'Unpaid', fine_date: '2024-08-29' },
    { fine_id: 12, transaction_id: 30, member_id: 30, fine_amount: 16.00, paid_status: 'Paid',   fine_date: '2024-09-02' },
    { fine_id: 13, transaction_id: 32, member_id: 4,  fine_amount: 8.00,  paid_status: 'Unpaid', fine_date: '2024-09-21' },
    { fine_id: 14, transaction_id: 36, member_id: 12, fine_amount: 12.00, paid_status: 'Paid',   fine_date: '2024-09-27' },
    { fine_id: 15, transaction_id: 39, member_id: 18, fine_amount: 14.00, paid_status: 'Paid',   fine_date: '2024-10-01' },
    { fine_id: 16, transaction_id: 5,  member_id: 5,  fine_amount: 20.00, paid_status: 'Unpaid', fine_date: '2024-10-01' },
    { fine_id: 17, transaction_id: 9,  member_id: 9,  fine_amount: 22.00, paid_status: 'Unpaid', fine_date: '2024-10-01' },
    { fine_id: 18, transaction_id: 15, member_id: 15, fine_amount: 18.00, paid_status: 'Unpaid', fine_date: '2024-10-01' },
    { fine_id: 19, transaction_id: 19, member_id: 19, fine_amount: 24.00, paid_status: 'Unpaid', fine_date: '2024-10-01' },
    { fine_id: 20, transaction_id: 24, member_id: 24, fine_amount: 10.00, paid_status: 'Unpaid', fine_date: '2024-10-01' },
  ],
};

/* ── COUNTERS (auto-increment simulation) ─────────────────── */
const _counters = {
  publishers:   _data.publishers.length  + 1,
  categories:   _data.categories.length  + 1,
  authors:      _data.authors.length     + 1,
  books:        _data.books.length       + 1,
  members:      _data.members.length     + 1,
  librarians:   _data.librarians.length  + 1,
  copies:       _data.copies.length      + 1,
  transactions: _data.transactions.length + 1,
  fines:        _data.fines.length       + 1,
};

/* ── PRIMARY KEY MAP ─────────────────────────────────────── */
const _pkField = {
  publishers:   'publisher_id',
  categories:   'category_id',
  authors:      'author_id',
  books:        'book_id',
  members:      'member_id',
  librarians:   'librarian_id',
  copies:       'copy_id',
  transactions: 'transaction_id',
  fines:        'fine_id',
};

/* ── EXPORTED DB OBJECT ──────────────────────────────────── */
const db = {

  /** Return a shallow copy of all rows in a table. */
  getAll(table) {
    if (!_data[table]) throw new Error(`Unknown table: ${table}`);
    return [..._data[table]];
  },

  /** Find a single row by primary key value. */
  getById(table, id) {
    const pk = _pkField[table];
    return _data[table].find(row => row[pk] === Number(id)) ?? null;
  },

  /** Insert a new row; returns the new row with its generated PK. */
  create(table, data) {
    const pk = _pkField[table];
    const newRow = { [pk]: _counters[table]++, ...data };
    _data[table].push(newRow);
    return { ...newRow };
  },

  /** Update an existing row by PK; returns the updated row or null. */
  update(table, id, data) {
    const pk = _pkField[table];
    const idx = _data[table].findIndex(row => row[pk] === Number(id));
    if (idx === -1) return null;
    _data[table][idx] = { ..._data[table][idx], ...data };
    return { ..._data[table][idx] };
  },

  /** Delete a row by PK. Returns true if deleted, false if not found. */
  delete(table, id) {
    const pk = _pkField[table];
    const idx = _data[table].findIndex(row => row[pk] === Number(id));
    if (idx === -1) return false;
    _data[table].splice(idx, 1);
    return true;
  },

  /** Replace the entire dataset (used by storage for restore). */
  restore(snapshot) {
    Object.keys(snapshot).forEach(key => {
      if (_data[key] !== undefined) {
        _data[key] = snapshot[key];
        if (_pkField[key]) {
          const pk = _pkField[key];
          const maxId = _data[key].reduce((m, r) => Math.max(m, r[pk] ?? 0), 0);
          _counters[key] = maxId + 1;
        }
      }
    });
  },

  /** Export a serialisable snapshot of all data. */
  snapshot() {
    return JSON.parse(JSON.stringify(_data));
  },

  /** book_authors helpers */
  getAuthorsByBook(bookId) {
    return _data.bookAuthors
      .filter(ba => ba.book_id === Number(bookId))
      .map(ba => _data.authors.find(a => a.author_id === ba.author_id))
      .filter(Boolean);
  },

  getBooksByAuthor(authorId) {
    return _data.bookAuthors
      .filter(ba => ba.author_id === Number(authorId))
      .map(ba => _data.books.find(b => b.book_id === ba.book_id))
      .filter(Boolean);
  },

  setBookAuthors(bookId, authorIds) {
    _data.bookAuthors = _data.bookAuthors.filter(ba => ba.book_id !== Number(bookId));
    authorIds.forEach(aid => {
      _data.bookAuthors.push({ book_id: Number(bookId), author_id: Number(aid) });
    });
  },
};

/* ════════════════════════════════════════════════════════════════════════
   SECTION: dataHelpers.js — Domain-specific helpers that cross-reference
   DB tables. Depends on: db, helpers (above).
   ════════════════════════════════════════════════════════════════════════ */

/** "First Last" from an author record */
function authorName(author) {
  if (!author) return '—';
  return `${author.first_name} ${author.last_name}`;
}

/** Get author name by ID */
function getAuthorName(id) {
  const a = db.getById('authors', id);
  return a ? authorName(a) : '—';
}

/** Get member full name by ID */
function getMemberName(id) {
  const m = db.getById('members', id);
  return m ? `${m.first_name} ${m.last_name}` : '—';
}

/** Get librarian full name by ID */
function getLibrarianName(id) {
  const l = db.getById('librarians', id);
  return l ? `${l.first_name} ${l.last_name}` : '—';
}

/** Get publisher name by ID */
function getPublisherName(id) {
  const p = db.getById('publishers', id);
  return p ? p.publisher_name : '—';
}

/** Get category name by ID */
function getCategoryName(id) {
  const c = db.getById('categories', id);
  return c ? c.category_name : '—';
}

/** Get book title by ID */
function getBookTitle(id) {
  const b = db.getById('books', id);
  return b ? b.title : '—';
}

/** Get book title from copy ID */
function getBookTitleByCopy(copyId) {
  const copy = db.getById('copies', copyId);
  if (!copy) return '—';
  return getBookTitle(copy.book_id);
}

/** Get comma-separated author names for a book */
function getBookAuthorsString(bookId) {
  const authors = db.getAuthorsByBook(bookId);
  return authors.length ? authors.map(authorName).join(', ') : 'No authors';
}

/** Build <option> elements for a select from a table */
function buildOptions(table, valueField, labelFn, selected = null) {
  const rows = db.getAll(table);
  return rows.map(row => {
    const val = row[valueField];
    const label = labelFn(row);
    const sel = selected != null && Number(selected) === Number(val) ? ' selected' : '';
    return `<option value="${val}"${sel}>${label}</option>`;
  }).join('');
}

/** Check if member's membership is active */
function isMembershipActive(member) {
  return member.membership_expiry >= today();
}

/** Membership status string */
function membershipStatus(member) {
  return isMembershipActive(member) ? 'Active' : 'Expired';
}

/** Calculate fine for a transaction (Rs. 2/day) */
function calculateFine(transaction) {
  if (transaction.status === 'Returned' && transaction.return_date) {
    const days = daysBetween(transaction.due_date, transaction.return_date);
    return Math.max(0, days * 2);
  }
  if (transaction.status === 'Overdue' || transaction.status === 'Issued') {
    const refDate = transaction.return_date || today();
    const days = daysBetween(transaction.due_date, refDate);
    return Math.max(0, days * 2);
  }
  return 0;
}

/** Get count of active (Issued/Overdue) books for a member */
function getMemberActiveBorrows(memberId) {
  return db.getAll('transactions').filter(
    t => t.member_id === Number(memberId) && (t.status === 'Issued' || t.status === 'Overdue')
  ).length;
}

/** Get total unpaid fines for a member */
function getMemberUnpaidFines(memberId) {
  return db.getAll('fines')
    .filter(f => f.member_id === Number(memberId) && f.paid_status === 'Unpaid')
    .reduce((sum, f) => sum + Number(f.fine_amount), 0);
}

/** Dashboard statistics */
function getDashboardStats() {
  const books        = db.getAll('books');
  const members      = db.getAll('members');
  const copies       = db.getAll('copies');
  const transactions = db.getAll('transactions');
  const fines        = db.getAll('fines');

  const totalCopies     = copies.length;
  const availableCopies = copies.filter(c => c.is_available).length;
  const issuedCopies    = totalCopies - availableCopies;

  const overdue  = transactions.filter(t => t.status === 'Overdue').length;
  const issued   = transactions.filter(t => t.status === 'Issued').length;

  const unpaidFines = fines.filter(f => f.paid_status === 'Unpaid');
  const totalUnpaid = unpaidFines.reduce((s, f) => s + Number(f.fine_amount), 0);

  const activeMembers = members.filter(m => isMembershipActive(m)).length;

  return {
    totalBooks:     books.length,
    totalMembers:   members.length,
    activeMembers,
    totalCopies,
    availableCopies,
    issuedCopies,
    totalTransactions: transactions.length,
    overdue,
    issued,
    totalFines:     fines.length,
    unpaidCount:    unpaidFines.length,
    totalUnpaid,
  };
}

/** Recent transactions (last N, enriched) */
function getRecentTransactions(n = 8) {
  const txns = db.getAll('transactions');
  return txns
    .slice(-n)
    .reverse()
    .map(t => ({
      ...t,
      memberName:  getMemberName(t.member_id),
      bookTitle:   getBookTitleByCopy(t.copy_id),
      issueDate:   formatDate(t.issue_date),
      dueDate:     formatDate(t.due_date),
      returnDate:  formatDate(t.return_date),
      statusHtml:  statusBadge(t.status),
    }));
}

/** Category book count */
function getCategoryBookCounts() {
  const categories = db.getAll('categories');
  const books = db.getAll('books');
  return categories.map(c => ({
    ...c,
    bookCount: books.filter(b => b.category_id === c.category_id).length,
  })).sort((a, b) => b.bookCount - a.bookCount);
}

/** Publisher book count */
function getPublisherBookCounts() {
  const publishers = db.getAll('publishers');
  const books = db.getAll('books');
  return publishers.map(p => ({
    ...p,
    bookCount: books.filter(b => b.publisher_id === p.publisher_id).length,
  })).sort((a, b) => b.bookCount - a.bookCount);
}

/** Member borrowing summary */
function getMemberBorrowingSummary() {
  const members = db.getAll('members');
  const transactions = db.getAll('transactions');
  const fines = db.getAll('fines');
  return members.map(m => {
    const txns = transactions.filter(t => t.member_id === m.member_id);
    const overdueCount = txns.filter(t => t.status === 'Overdue').length;
    const unpaidFines  = fines.filter(f => f.member_id === m.member_id && f.paid_status === 'Unpaid');
    return {
      ...m,
      fullName:           `${m.first_name} ${m.last_name}`,
      totalTransactions:  txns.length,
      overdueCount,
      unpaidFines:        unpaidFines.reduce((s, f) => s + Number(f.fine_amount), 0),
      memberStatus:       membershipStatus(m),
    };
  });
}

/** Get available copies for a specific book */
function getAvailableCopiesForBook(bookId) {
  return db.getAll('copies').filter(
    c => c.book_id === Number(bookId) && c.is_available
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: storage.js — Persist the in-memory DB to localStorage.
   ════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'clms_db_v1';

/** Save the current DB snapshot to localStorage. */
function saveDatabase() {
  try {
    const snapshot = db.snapshot();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('[storage] Failed to save:', err);
  }
}

/** Load and restore the DB from localStorage. Returns true if restored. */
function loadDatabase() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const snapshot = JSON.parse(raw);
    if (!snapshot || typeof snapshot !== 'object') return false;
    db.restore(snapshot);
    return true;
  } catch (err) {
    console.warn('[storage] Failed to load (corrupted?). Using defaults.', err);
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}

/** Clear saved data and reset to the built-in sample dataset. */
function resetDatabase() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[storage] Failed to reset:', err);
  }
}

/** Return true if saved data exists in localStorage. */
function hasSavedData() {
  return Boolean(localStorage.getItem(STORAGE_KEY));
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: emptyStates.js — Reusable empty-state HTML components.
   ════════════════════════════════════════════════════════════════════════ */

const EMPTY_STATE_DEFAULTS = {
  books:        { title: 'No books found',        message: 'Add your first book to the catalog.' },
  authors:      { title: 'No authors found',      message: 'Add author records to get started.' },
  publishers:   { title: 'No publishers found',   message: 'Add publisher records to the catalog.' },
  categories:   { title: 'No categories found',   message: 'Create categories to organise your books.' },
  copies:       { title: 'No book copies found',  message: 'Add physical copies for books in the catalog.' },
  members:      { title: 'No members found',       message: 'Register members to allow book borrowing.' },
  librarians:   { title: 'No librarians found',   message: 'Add librarian staff records.' },
  transactions: { title: 'No transactions found', message: 'Transactions appear here when books are issued.' },
  fines:        { title: 'No fines found',         message: 'Fines are recorded when books are returned late.' },
  reports:      { title: 'No report data',         message: 'Data will appear here as transactions are recorded.' },
  search:       { title: 'No results',             message: 'Try adjusting your search query.' },
  generic:      { title: 'Nothing here yet',       message: 'No records to display.' },
};

/** Return the HTML for an empty state. */
function emptyState(type = 'generic', message = null, actionHtml = '') {
  const cfg = EMPTY_STATE_DEFAULTS[type] ?? EMPTY_STATE_DEFAULTS.generic;
  return `
    <div class="empty-state">
      <div class="empty-state__icon"></div>
      <h3 class="empty-state__title">${cfg.title}</h3>
      <p class="empty-state__message">${message ?? cfg.message}</p>
      ${actionHtml}
    </div>
  `;
}

/** Inject the empty-state HTML directly into a container. */
function showEmptyState(container, type = 'generic', message = null, actionHtml = '') {
  container.innerHTML = emptyState(type, message, actionHtml);
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: loadingStates.js — Reusable loading skeleton components.
   ════════════════════════════════════════════════════════════════════════ */

function tableLoadingSkeleton(rows = 8, cols = 5) {
  const cells = Array(cols).fill('<td><div class="skeleton skeleton-text"></div></td>').join('');
  const rowHtml = Array(rows).fill(`<tr>${cells}</tr>`).join('');
  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>${Array(cols).fill('<th><div class="skeleton skeleton-text-sm"></div></th>').join('')}</tr>
        </thead>
        <tbody>${rowHtml}</tbody>
      </table>
    </div>
  `;
}

function dashboardLoadingSkeleton(cards = 6) {
  const cardHtml = Array(cards).fill(`
    <div class="stat-card skeleton-card">
      <div class="skeleton skeleton-text" style="width:60%;margin-bottom:10px"></div>
      <div class="skeleton skeleton-text" style="width:40%;height:30px"></div>
    </div>
  `).join('');
  return `<div class="stats-grid">${cardHtml}</div>`;
}

function cardLoadingSkeleton(lines = 4) {
  const lineHtml = Array(lines).fill('<div class="skeleton skeleton-text" style="margin-bottom:10px"></div>').join('');
  return `<div class="card-body">${lineHtml}</div>`;
}

function showLoading(container, type = 'table') {
  if (type === 'table')     container.innerHTML = tableLoadingSkeleton();
  else if (type === 'dash') container.innerHTML = dashboardLoadingSkeleton();
  else                      container.innerHTML = cardLoadingSkeleton();
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: router.js — Hash-based client-side router.
   ════════════════════════════════════════════════════════════════════════ */

const _routes = new Map();
let _notFound = null;
let _onChange  = null;

function addRoute(route, handler) {
  _routes.set(route, handler);
}

function onRouteChange(cb) {
  _onChange = cb;
}

function setNotFound(handler) {
  _notFound = handler;
}

function navigate(route) {
  window.location.hash = route;
}

function startRouter() {
  window.addEventListener('hashchange', _handleRoute);
  _handleRoute(); // handle on load
}

function _handleRoute() {
  const hash   = window.location.hash.replace('#', '').trim() || 'dashboard';
  const handler = _routes.get(hash);

  if (handler) {
    handler();
  } else if (_notFound) {
    _notFound(hash);
  }

  if (_onChange) _onChange(hash);

  const bc = document.getElementById('breadcrumb-current');
  if (bc) bc.textContent = _routeLabel(hash);

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === hash);
  });

  const main = document.getElementById('app-content');
  if (main) main.scrollTop = 0;
}

function _routeLabel(route) {
  const labels = {
    dashboard:    'Dashboard',
    books:        'Books',
    authors:      'Authors',
    publishers:   'Publishers',
    categories:   'Categories',
    copies:       'Book Copies',
    members:      'Members',
    librarians:   'Librarians',
    transactions: 'Transactions',
    fines:        'Fines',
    reports:      'Reports',
  };
  return labels[route] ?? route.charAt(0).toUpperCase() + route.slice(1);
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: themeManager.js — Dark/light theme toggle with persistence.
   ════════════════════════════════════════════════════════════════════════ */

const THEME_KEY = 'clms_theme';

let _isDark = false;

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  _isDark = saved === 'dark';
  _applyTheme();
}

function toggleTheme() {
  _isDark = !_isDark;
  _applyTheme();
  localStorage.setItem(THEME_KEY, _isDark ? 'dark' : 'light');
}

function isDarkTheme() {
  return _isDark;
}

function _applyTheme() {
  document.body.classList.toggle('dark-theme', _isDark);
  const labelEl = document.getElementById('theme-label');
  if (labelEl) labelEl.textContent = _isDark ? 'Light Mode' : 'Dark Mode';
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: responsive-navigation.js — Mobile-responsive sidebar navigation.
   ════════════════════════════════════════════════════════════════════════ */

const SIDEBAR_ID         = 'sidebar';
const OVERLAY_ID         = 'sidebar-overlay';
const HAMBURGER_ID       = 'hamburger-btn';
const NAV_ITEM_SELECTOR  = '.nav-item';
const SIDEBAR_OPEN_CLASS = 'sidebar--open';
const OVERLAY_SHOW_CLASS = 'sidebar-overlay--visible';

let sidebar   = null;
let overlay   = null;
let hamburger = null;
let isOpen    = false;

function openSidebar() {
  if (!sidebar) return;
  isOpen = true;
  sidebar.classList.add(SIDEBAR_OPEN_CLASS);
  overlay.classList.add(OVERLAY_SHOW_CLASS);
  overlay.setAttribute('aria-hidden', 'false');
  hamburger.setAttribute('aria-expanded', 'true');
  const firstItem = sidebar.querySelector(NAV_ITEM_SELECTOR);
  if (firstItem) firstItem.focus();
}

function closeSidebar(returnFocus = true) {
  if (!sidebar) return;
  isOpen = false;
  sidebar.classList.remove(SIDEBAR_OPEN_CLASS);
  overlay.classList.remove(OVERLAY_SHOW_CLASS);
  overlay.setAttribute('aria-hidden', 'true');
  hamburger.setAttribute('aria-expanded', 'false');
  if (returnFocus && hamburger) hamburger.focus();
}

function toggleSidebar() {
  isOpen ? closeSidebar() : openSidebar();
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function handleResize() {
  if (!isMobileViewport() && isOpen) closeSidebar(false);
}

function handleNavItemKeydown(e) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    e.currentTarget.click();
  }
}

function handleGlobalKeydown(e) {
  if (e.key === 'Escape' && isOpen) closeSidebar(true);
}

function navOnRouteChange() {
  if (isMobileViewport() && isOpen) closeSidebar(false);
}

function initResponsiveNav() {
  sidebar   = document.getElementById(SIDEBAR_ID);
  overlay   = document.getElementById(OVERLAY_ID);
  hamburger = document.getElementById(HAMBURGER_ID);

  if (!sidebar || !overlay || !hamburger) {
    console.warn('[responsive-navigation] Required elements not found.');
    return;
  }

  hamburger.addEventListener('click', toggleSidebar);
  overlay.addEventListener('click', () => closeSidebar(true));

  const navItems = sidebar.querySelectorAll(NAV_ITEM_SELECTOR);
  navItems.forEach(item => {
    item.addEventListener('click', () => { if (isMobileViewport()) closeSidebar(false); });
    item.addEventListener('keydown', handleNavItemKeydown);
  });

  document.addEventListener('keydown', handleGlobalKeydown);
  window.addEventListener('resize', handleResize);

  hamburger.setAttribute('aria-expanded', 'false');
  overlay.setAttribute('aria-hidden', 'true');
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: modal.js — Reusable modal dialog component.
   ════════════════════════════════════════════════════════════════════════ */

let _activeModal = null;

function openModal({ title, fields = [], data = {}, submitLabel = 'Save', wide = false }) {
  return new Promise(resolve => {
    closeModal();

    const overlayEl = document.createElement('div');
    overlayEl.className = 'modal-overlay';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');
    overlayEl.setAttribute('aria-labelledby', 'modal-title');

    const formHtml = fields.map(field => renderField(field, data)).join('');

    overlayEl.innerHTML = `
      <div class="modal${wide ? ' modal--wide' : ''}" style="${wide ? 'max-width:700px' : ''}">
        <div class="modal-header">
          <h2 class="modal-title" id="modal-title">${escHtml(title)}</h2>
          <button class="modal-close" aria-label="Close modal" data-action="close">✕</button>
        </div>
        <form class="modal-form" novalidate>
          <div class="modal-body">
            <div class="form-grid">${formHtml}</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">${escHtml(submitLabel)}</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlayEl);
    _activeModal = overlayEl;

    const first = overlayEl.querySelector('input, select, textarea, button');
    if (first) setTimeout(() => first.focus(), 60);

    overlayEl.querySelector('[data-action="close"]').addEventListener('click', () => { closeModal(); resolve(null); });
    overlayEl.querySelector('[data-action="cancel"]').addEventListener('click', () => { closeModal(); resolve(null); });
    overlayEl.addEventListener('click', e => { if (e.target === overlayEl) { closeModal(); resolve(null); } });

    const onKey = e => {
      if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); closeModal(); resolve(null); }
    };
    document.addEventListener('keydown', onKey);

    overlayEl.querySelector('.modal-form').addEventListener('submit', e => {
      e.preventDefault();
      const errors = validateForm(overlayEl, fields);
      if (errors.length) return;
      const result = collectFormData(overlayEl, fields);
      document.removeEventListener('keydown', onKey);
      closeModal();
      resolve(result);
    });
  });
}

function openConfirm({ title = 'Confirm', message, confirmLabel = 'Delete', danger = true }) {
  return new Promise(resolve => {
    closeModal();

    const overlayEl = document.createElement('div');
    overlayEl.className = 'modal-overlay';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');

    overlayEl.innerHTML = `
      <div class="modal confirm-modal">
        <div class="modal-header">
          <h2 class="modal-title">${escHtml(title)}</h2>
          <button class="modal-close" aria-label="Close" data-action="close">✕</button>
        </div>
        <div class="modal-body">
          <div class="confirm-icon">${danger ? '🗑️' : '❓'}</div>
          <p class="confirm-message">${message}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${escHtml(confirmLabel)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlayEl);
    _activeModal = overlayEl;

    const cleanup = (val) => { closeModal(); resolve(val); };

    overlayEl.querySelector('[data-action="close"]').addEventListener('click', () => cleanup(false));
    overlayEl.querySelector('[data-action="cancel"]').addEventListener('click', () => cleanup(false));
    overlayEl.querySelector('[data-action="confirm"]').addEventListener('click', () => cleanup(true));
    overlayEl.addEventListener('click', e => { if (e.target === overlayEl) cleanup(false); });

    const onKey = e => { if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); cleanup(false); } };
    document.addEventListener('keydown', onKey);

    setTimeout(() => overlayEl.querySelector('[data-action="confirm"]').focus(), 60);
  });
}

function closeModal() {
  if (_activeModal) {
    _activeModal.remove();
    _activeModal = null;
  }
}

function renderField(field, data) {
  const val = data[field.name] ?? field.default ?? '';
  const required = field.required ? '<span class="required">*</span>' : '';
  const spanClass = field.span ? ` span-${field.span}` : '';

  let input = '';

  if (field.type === 'select') {
    const opts = field.options.map(o => {
      const oVal = typeof o === 'object' ? o.value : o;
      const oLabel = typeof o === 'object' ? o.label : o;
      const sel = String(val) === String(oVal) ? ' selected' : '';
      return `<option value="${escHtml(oVal)}"${sel}>${escHtml(oLabel)}</option>`;
    }).join('');
    input = `<select class="form-control" name="${field.name}" id="f-${field.name}" ${field.required ? 'required' : ''}>
      <option value="">— Select —</option>${opts}
    </select>`;
  } else if (field.type === 'textarea') {
    input = `<textarea class="form-control" name="${field.name}" id="f-${field.name}" rows="3"
      placeholder="${escHtml(field.placeholder ?? '')}" ${field.required ? 'required' : ''}>${escHtml(val)}</textarea>`;
  } else if (field.type === 'multi-select') {
    const opts = field.options.map(o => {
      const oVal = typeof o === 'object' ? o.value : o;
      const oLabel = typeof o === 'object' ? o.label : o;
      const selArr = Array.isArray(val) ? val.map(String) : String(val).split(',').map(s => s.trim());
      const sel = selArr.includes(String(oVal)) ? ' selected' : '';
      return `<option value="${escHtml(oVal)}"${sel}>${escHtml(oLabel)}</option>`;
    }).join('');
    input = `<select class="form-control" name="${field.name}" id="f-${field.name}" multiple size="4"
      ${field.required ? 'required' : ''}>${opts}</select>
      <small class="text-muted" style="font-size:11px;margin-top:3px">Hold Ctrl/Cmd to select multiple</small>`;
  } else {
    const typeAttr = field.type || 'text';
    const step = field.step ? ` step="${field.step}"` : '';
    const min  = field.min  ? ` min="${field.min}"` : '';
    const max  = field.max  ? ` max="${field.max}"` : '';
    input = `<input class="form-control" type="${typeAttr}" name="${field.name}" id="f-${field.name}"
      value="${escHtml(String(val))}" placeholder="${escHtml(field.placeholder ?? '')}"
      ${field.required ? 'required' : ''} ${step}${min}${max} />`;
  }

  return `
    <div class="form-group${spanClass}">
      <label class="form-label" for="f-${field.name}">${escHtml(field.label)}${required}</label>
      ${input}
      <span class="form-error" id="err-${field.name}"></span>
    </div>
  `;
}

function validateForm(overlayEl, fields) {
  const errors = [];
  fields.forEach(field => {
    const el = overlayEl.querySelector(`[name="${field.name}"]`);
    const errEl = overlayEl.querySelector(`#err-${field.name}`);
    if (!el || !errEl) return;

    el.classList.remove('error');
    errEl.textContent = '';

    const val = el.value.trim();

    if (field.required && !val) {
      el.classList.add('error');
      errEl.textContent = `${field.label} is required.`;
      errors.push(field.name);
      return;
    }

    // BUGFIX (#6): min/max constraints on number fields were declared in
    // field config (and rendered as HTML attributes) but never actually
    // checked by our own validation pass, so out-of-range values could
    // slip through whenever native browser validation was bypassed.
    if (field.type === 'number' && val !== '') {
      const num = Number(val);
      if (field.min !== undefined && field.min !== '' && num < Number(field.min)) {
        el.classList.add('error');
        errEl.textContent = `${field.label} must be at least ${field.min}.`;
        errors.push(field.name);
        return;
      }
      if (field.max !== undefined && field.max !== '' && num > Number(field.max)) {
        el.classList.add('error');
        errEl.textContent = `${field.label} must be at most ${field.max}.`;
        errors.push(field.name);
        return;
      }
    }

    if (field.validate && val) {
      const msg = field.validate(val);
      if (msg) {
        el.classList.add('error');
        errEl.textContent = msg;
        errors.push(field.name);
      }
    }
  });
  if (errors.length) {
    const firstErr = overlayEl.querySelector('[name="' + errors[0] + '"]');
    if (firstErr) firstErr.focus();
  }
  return errors;
}

function collectFormData(overlayEl, fields) {
  const result = {};
  fields.forEach(field => {
    const el = overlayEl.querySelector(`[name="${field.name}"]`);
    if (!el) return;

    if (field.type === 'multi-select') {
      result[field.name] = Array.from(el.selectedOptions).map(o => o.value);
    } else if (field.type === 'number') {
      result[field.name] = el.value !== '' ? Number(el.value) : null;
    } else if (field.type === 'checkbox') {
      result[field.name] = el.checked ? 1 : 0;
    } else {
      result[field.name] = el.value.trim();
    }
  });
  return result;
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: table.js — Generic sortable, searchable, paginated table.
   ════════════════════════════════════════════════════════════════════════ */

const TABLE_PER_PAGE = 15;

function renderTable(container, { columns = [], data = [], actions = null, emptyMsg = 'No records found.', searchable = true }) {
  let currentData = [...data];
  let filtered    = [...data];
  let sortKey     = null;
  let sortDir     = 'asc';
  let searchQuery = '';
  let page        = 1;

  function render() {
    const total = filtered.length;
    const pages = totalPages(total, TABLE_PER_PAGE);
    page = Math.min(page, pages);
    const rows = paginate(filtered, page, TABLE_PER_PAGE);
    const start = (page - 1) * TABLE_PER_PAGE + 1;
    const end   = Math.min(page * TABLE_PER_PAGE, total);

    container.innerHTML = `
      ${searchable ? `
        <div class="card-header">
          <div class="search-bar">
            <div class="search-input-wrap">
              <input
                type="search"
                class="search-input"
                placeholder="Search…"
                value="${escHtml(searchQuery)}"
                aria-label="Search records"
                id="tbl-search"
              />
            </div>
          </div>
          <div class="topbar__spacer"></div>
        </div>
      ` : ''}
      <div class="table-wrap">
        <table class="data-table" role="grid">
          <thead>
            <tr>
              ${columns.map(col => `
                <th class="${col.sortable !== false ? 'sortable' : ''} ${sortKey === col.key ? 'sort-' + sortDir : ''}"
                    data-key="${escHtml(col.key)}"
                    tabindex="${col.sortable !== false ? 0 : -1}"
                    aria-sort="${sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}">
                  ${escHtml(col.label)}
                  ${col.sortable !== false ? `<span class="sort-icon">${sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}</span>` : ''}
                </th>
              `).join('')}
              ${actions ? '<th>Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0
              ? `<tr><td colspan="${columns.length + (actions ? 1 : 0)}" style="text-align:center;padding:40px;color:var(--text-muted)">${escHtml(emptyMsg)}</td></tr>`
              : rows.map(row => `
                  <tr>
                    ${columns.map(col => `<td>${col.render ? col.render(row) : escHtml(String(row[col.key] ?? '—'))}</td>`).join('')}
                    ${actions ? `<td><div class="table-actions">${actions(row)}</div></td>` : ''}
                  </tr>
                `).join('')
            }
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <span class="pagination__info">
          ${total === 0 ? 'No records' : `Showing ${start}–${end} of ${total} records`}
        </span>
        ${renderPagination(page, pages)}
      </div>
    `;

    bindEvents();
  }

  function renderPagination(current, pages) {
    if (pages <= 1) return '<div class="pagination__controls"></div>';
    const buttons = [];

    buttons.push(`<button class="pagination__btn" data-page="prev" ${current === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>`);

    const maxButtons = 5;
    let startP = Math.max(1, current - Math.floor(maxButtons / 2));
    let endP   = Math.min(pages, startP + maxButtons - 1);
    if (endP - startP < maxButtons - 1) startP = Math.max(1, endP - maxButtons + 1);

    if (startP > 1) {
      buttons.push(`<button class="pagination__btn" data-page="1">1</button>`);
      if (startP > 2) buttons.push(`<span class="pagination__btn" style="cursor:default">…</span>`);
    }

    for (let i = startP; i <= endP; i++) {
      buttons.push(`<button class="pagination__btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`);
    }

    if (endP < pages) {
      if (endP < pages - 1) buttons.push(`<span class="pagination__btn" style="cursor:default">…</span>`);
      buttons.push(`<button class="pagination__btn" data-page="${pages}">${pages}</button>`);
    }

    buttons.push(`<button class="pagination__btn" data-page="next" ${current === pages ? 'disabled' : ''} aria-label="Next page">›</button>`);

    return `<div class="pagination__controls">${buttons.join('')}</div>`;
  }

  function bindEvents() {
    const searchEl = container.querySelector('#tbl-search');
    if (searchEl) {
      searchEl.addEventListener('input', e => {
        searchQuery = e.target.value;
        filtered = applyFilter(currentData, searchQuery);
        page = 1;
        render();
        const newSearch = container.querySelector('#tbl-search');
        if (newSearch) { newSearch.focus(); newSearch.setSelectionRange(searchQuery.length, searchQuery.length); }
      });
    }

    container.querySelectorAll('th.sortable').forEach(th => {
      const activate = () => {
        const key = th.dataset.key;
        if (sortKey === key) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = key;
          sortDir = 'asc';
        }
        filtered = sortBy(filtered, sortKey, sortDir);
        page = 1;
        render();
      };
      th.addEventListener('click', activate);
      th.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
    });

    container.querySelectorAll('.pagination__btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.page;
        if (btn.disabled) return;
        if (p === 'prev') page = Math.max(1, page - 1);
        else if (p === 'next') page = Math.min(totalPages(filtered.length, TABLE_PER_PAGE), page + 1);
        else page = parseInt(p, 10);
        render();
      });
    });
  }

  function applyFilter(data, query) {
    let result = filterByQuery(data, query);
    if (sortKey) result = sortBy(result, sortKey, sortDir);
    return result;
  }

  render();

  return {
    refresh(newData) {
      currentData = [...newData];
      filtered = applyFilter(currentData, searchQuery);
      page = 1;
      render();
    },
  };
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: crudPage.js — Factory that creates a complete CRUD page.
   ════════════════════════════════════════════════════════════════════════ */

function renderCrudPage(config) {
  const {
    table,
    title,
    subtitle  = '',
    columns   = [],
    fields    = [],
    pkField,
    beforeSave   = null,
    afterSave    = null,
    afterDelete  = null,
    canDelete    = null,
    enrichData   = null,
    extraActions = null,
    addLabel     = 'Add New',
    readonly     = false,
    headerExtras = '',
  } = config;

  // BUGFIX (#2): use real singularization instead of a blind `s$` strip,
  // which mangled labels like "Categories" -> "Categorie" and
  // "Book Copies" -> "Book Copie" in modal titles / toast messages.
  const singular = singularize(title);

  const content = document.getElementById('app-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">${title}</h1>
        ${subtitle ? `<p class="page-header__subtitle">${subtitle}</p>` : ''}
      </div>
      <div class="page-header__actions">
        ${headerExtras}
        ${!readonly ? `<button class="btn btn-primary" id="crud-add-btn">${addLabel}</button>` : ''}
      </div>
    </div>
    <div class="card">
      <div id="crud-table-container"></div>
    </div>
  `;

  const tableContainer = content.querySelector('#crud-table-container');
  let tableInstance;

  function getDisplayData() {
    const raw = db.getAll(table);
    return enrichData ? enrichData(raw) : raw;
  }

  function buildActions(row) {
    const pk = row[pkField];
    const extra = extraActions ? extraActions(row) : '';
    if (readonly) return extra;
    return `
      ${extra}
      <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${pk}">Edit</button>
      <button class="btn btn-danger btn-sm" data-action="delete" data-id="${pk}">Delete</button>
    `;
  }

  function renderTableView() {
    const displayData = getDisplayData();
    tableInstance = renderTable(tableContainer, {
      columns,
      data: displayData,
      actions: buildActions,
      emptyMsg: `No ${title.toLowerCase()} found. Click "${addLabel}" to get started.`,
    });

    tableContainer.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id     = btn.dataset.id;
      if (action === 'edit')   handleEdit(id);
      if (action === 'delete') handleDelete(id);
    });
  }

  async function handleAdd() {
    const result = await openModal({
      title:       `Add ${singular}`,
      fields,
      submitLabel: 'Add',
    });
    if (!result) return;

    let data = result;
    if (beforeSave) {
      const transformed = beforeSave(data, false);
      if (transformed === null) return;
      data = transformed;
    }

    const newRow = db.create(table, data);
    if (afterSave) afterSave(newRow, false);
    saveDatabase();
    showToast(`${singular} added successfully.`, 'success');
    tableInstance.refresh(getDisplayData());
  }

  async function handleEdit(id) {
    const row = db.getById(table, id);
    if (!row) return;

    const result = await openModal({
      title:       `Edit ${singular}`,
      fields,
      data:        row,
      submitLabel: 'Update',
    });
    if (!result) return;

    let data = result;
    if (beforeSave) {
      const transformed = beforeSave(data, true, row);
      if (transformed === null) return;
      data = transformed;
    }

    const updated = db.update(table, id, data);
    if (afterSave) afterSave(updated, true);
    saveDatabase();
    showToast(`${singular} updated successfully.`, 'success');
    tableInstance.refresh(getDisplayData());
  }

  async function handleDelete(id) {
    const row = db.getById(table, id);
    if (!row) return;

    if (canDelete) {
      const result = canDelete(row);
      if (result === false || typeof result === 'string') {
        showToast(typeof result === 'string' ? result : 'This record cannot be deleted.', 'error');
        return;
      }
    }

    const confirmed = await openConfirm({
      title:        `Delete ${singular}`,
      message:      `Are you sure you want to delete this record? <strong>This cannot be undone.</strong>`,
      confirmLabel: 'Delete',
      danger:       true,
    });
    if (!confirmed) return;

    db.delete(table, id);
    if (afterDelete) afterDelete(id);
    saveDatabase();
    showToast(`${singular} deleted.`, 'info');
    tableInstance.refresh(getDisplayData());
  }

  if (!readonly) {
    content.querySelector('#crud-add-btn')?.addEventListener('click', handleAdd);
  }

  renderTableView();

  return {
    refresh() { tableInstance?.refresh(getDisplayData()); },
  };
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: dashboard.js — Dashboard overview page.
   ════════════════════════════════════════════════════════════════════════ */

function renderDashboard() {
  const content = document.getElementById('app-content');
  if (!content) return;

  const stats     = getDashboardStats();
  const recent    = getRecentTransactions(8);
  const catCounts = getCategoryBookCounts().slice(0, 6);

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Dashboard</h1>
        <p class="page-header__subtitle">Welcome to the College Library Management System</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card stat-card--accent">
        <div class="stat-card__label">Total Books</div>
        <div class="stat-card__value">${stats.totalBooks}</div>
      </div>
      <div class="stat-card stat-card--success">
        <div class="stat-card__label">Available Copies</div>
        <div class="stat-card__value">${stats.availableCopies}</div>
      </div>
      <div class="stat-card stat-card--warning">
        <div class="stat-card__label">Currently Issued</div>
        <div class="stat-card__value">${stats.issuedCopies}</div>
      </div>
      <div class="stat-card stat-card--danger">
        <div class="stat-card__label">Overdue Books</div>
        <div class="stat-card__value">${stats.overdue}</div>
      </div>
      <div class="stat-card stat-card--accent">
        <div class="stat-card__label">Active Members</div>
        <div class="stat-card__value">${stats.activeMembers}</div>
      </div>
      <div class="stat-card stat-card--danger">
        <div class="stat-card__label">Unpaid Fines</div>
        <div class="stat-card__value">${formatRupees(stats.totalUnpaid)}</div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="card wide">
        <div class="card-header">
          <span class="card-title">Recent Transactions</span>
          <a href="#transactions" class="btn btn-secondary btn-sm">View All</a>
        </div>
        <div class="recent-list">
          ${recent.length === 0
            ? '<div class="card-body" style="text-align:center;color:var(--text-muted);font-size:13px">No transactions yet.</div>'
            : recent.map(t => `
                <div class="recent-item">
                  <div class="recent-item__dot"></div>
                  <div class="recent-item__body">
                    <div class="recent-item__title">${t.bookTitle}</div>
                    <div class="recent-item__sub">${t.memberName} &middot; Issued: ${t.issueDate} &middot; Due: ${t.dueDate}</div>
                  </div>
                  <div class="recent-item__badge">${t.statusHtml}</div>
                </div>
              `).join('')
          }
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Books by Category</span>
          <a href="#reports" class="btn btn-secondary btn-sm">Full Report</a>
        </div>
        <div class="card-body" style="padding:0">
          ${catCounts.map(c => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 20px;border-bottom:1px solid var(--border)">
              <span style="font-size:13px;color:var(--text-primary)">${c.category_name}</span>
              <span class="badge badge-muted">${c.bookCount}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Quick Stats</span>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${[
              { label: 'Total Members',      value: stats.totalMembers },
              { label: 'Total Transactions', value: stats.totalTransactions },
              { label: 'Total Copies',       value: stats.totalCopies },
              { label: 'Total Fines',        value: stats.totalFines },
              { label: 'Unpaid Fines',       value: stats.unpaidCount },
              { label: 'Issued Books',       value: stats.issuedCopies },
            ].map(s => `
              <div style="background:var(--bg-app);border-radius:var(--radius-sm);padding:12px;border:1px solid var(--border)">
                <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">${s.label}</div>
                <div style="font-size:20px;font-weight:700;color:var(--accent);font-family:var(--font-mono)">${s.value}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: books.js — Books CRUD page.
   ════════════════════════════════════════════════════════════════════════ */

function publisherOptions() {
  return db.getAll('publishers').map(p => ({ value: p.publisher_id, label: p.publisher_name }));
}
function categoryOptions() {
  return db.getAll('categories').map(c => ({ value: c.category_id, label: c.category_name }));
}
function authorOptions() {
  return db.getAll('authors').map(a => ({ value: a.author_id, label: `${a.first_name} ${a.last_name}` }));
}

const BOOK_FIELDS = [
  { name: 'title',          label: 'Title',          type: 'text',   required: true,  placeholder: 'Book title', span: 2 },
  { name: 'isbn',           label: 'ISBN',           type: 'text',   required: true,  placeholder: '978-0000000000' },
  { name: 'year_published', label: 'Year Published', type: 'number', required: false, placeholder: '2024', min: '1900', max: '2099' },
  { name: 'total_copies',   label: 'Total Copies',   type: 'number', required: true,  placeholder: '1', min: '1', default: 1 },
  { name: 'publisher_id',   label: 'Publisher',      type: 'select', required: true,  options: [] },
  { name: 'category_id',    label: 'Category',       type: 'select', required: true,  options: [] },
  { name: 'author_ids',     label: 'Author(s)',      type: 'multi-select', required: false, options: [], span: 2 },
];

function resolvedBookFields() {
  return BOOK_FIELDS.map(f => {
    if (f.name === 'publisher_id') return { ...f, options: publisherOptions() };
    if (f.name === 'category_id')  return { ...f, options: categoryOptions() };
    if (f.name === 'author_ids')   return { ...f, options: authorOptions() };
    return f;
  });
}

const BOOK_COLUMNS = [
  { key: 'book_id',       label: 'ID',       sortable: true },
  { key: 'title',         label: 'Title',    sortable: true },
  { key: 'authors',       label: 'Author(s)', sortable: false, render: r => getBookAuthorsString(r.book_id) },
  { key: 'category',      label: 'Category', sortable: false,  render: r => getCategoryName(r.category_id) },
  { key: 'publisher',     label: 'Publisher', sortable: false, render: r => getPublisherName(r.publisher_id) },
  { key: 'year_published',label: 'Year',     sortable: true,   render: r => r.year_published || '—' },
  { key: 'total_copies',  label: 'Copies',   sortable: true },
  { key: 'isbn',          label: 'ISBN',     sortable: true,   render: r => `<span class="text-mono" style="font-size:12px">${r.isbn}</span>` },
];

// BUGFIX (#1): previously the selected author IDs were smuggled through
// to afterSave() by stashing them as a `_author_ids` property directly on
// the data object passed to db.create()/db.update(). Because db.create()
// and db.update() store that exact object (by reference) into the table,
// `_author_ids` ended up permanently embedded in the saved book record —
// and therefore in every future read, render, and localStorage snapshot.
// Using a closure variable instead keeps it out of the persisted row.
let _pendingBookAuthorIds = [];

function renderBooks() {
  renderCrudPage({
    table:    'books',
    title:    'Books',
    subtitle: 'Manage the book catalog',
    icon:     '📖',
    pkField:  'book_id',
    columns:  BOOK_COLUMNS,
    fields:   resolvedBookFields(),
    addLabel: 'Add Book',

    beforeSave(data) {
      const { author_ids, ...bookData } = data;
      _pendingBookAuthorIds = (author_ids || []).map(Number);
      if (bookData.publisher_id) bookData.publisher_id = Number(bookData.publisher_id);
      if (bookData.category_id)  bookData.category_id  = Number(bookData.category_id);
      if (bookData.total_copies) bookData.total_copies  = Number(bookData.total_copies);
      if (bookData.year_published) bookData.year_published = Number(bookData.year_published);
      return bookData;
    },

    afterSave(row) {
      db.setBookAuthors(row.book_id, _pendingBookAuthorIds);
      _pendingBookAuthorIds = [];
    },

    canDelete(row) {
      const hasCopies = db.getAll('copies').some(c => c.book_id === row.book_id);
      return hasCopies ? 'Cannot delete: book has associated copies. Remove copies first.' : true;
    },

    afterDelete(id) {
      // BUGFIX (#8): this used to also run a no-op
      // `.filter(...).forEach(() => {})` before this call — dead code
      // that did nothing and has been removed.
      db.setBookAuthors(id, []);
    },
  });
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: authors.js — Authors CRUD page.
   ════════════════════════════════════════════════════════════════════════ */

const AUTHOR_FIELDS = [
  { name: 'first_name', label: 'First Name', type: 'text',  required: true,  placeholder: 'e.g. Donald' },
  { name: 'last_name',  label: 'Last Name',  type: 'text',  required: true,  placeholder: 'e.g. Knuth' },
  { name: 'email',      label: 'Email',      type: 'email', required: false, placeholder: 'author@example.com', span: 2,
    validate: v => v && !isValidEmail(v) ? 'Enter a valid email address.' : null },
];

const AUTHOR_COLUMNS = [
  { key: 'author_id',  label: 'ID',         sortable: true },
  { key: 'first_name', label: 'First Name', sortable: true },
  { key: 'last_name',  label: 'Last Name',  sortable: true },
  { key: 'email',      label: 'Email',      render: r => r.email || '—' },
  {
    key: 'books',
    label: 'Books',
    sortable: false,
    render: r => {
      const count = db.getAll('bookAuthors').filter(ba => ba.author_id === r.author_id).length;
      return `<span class="badge badge-accent">${count}</span>`;
    },
  },
];

function renderAuthors() {
  renderCrudPage({
    table:    'authors',
    title:    'Authors',
    subtitle: 'Manage book author records',
    icon:     '✍️',
    pkField:  'author_id',
    columns:  AUTHOR_COLUMNS,
    fields:   AUTHOR_FIELDS,
    addLabel: 'Add Author',
    canDelete(row) {
      const inUse = db.getAll('bookAuthors').some(ba => ba.author_id === row.author_id);
      return inUse ? 'Cannot delete: author is linked to one or more books.' : true;
    },
  });
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: publishers.js — Publishers CRUD page.
   ════════════════════════════════════════════════════════════════════════ */

const PUBLISHER_FIELDS = [
  { name: 'publisher_name', label: 'Publisher Name', type: 'text',  required: true, placeholder: 'e.g. Oxford University Press' },
  { name: 'address',        label: 'Address',        type: 'text',  required: false, placeholder: 'Street, City' },
  { name: 'phone',          label: 'Phone',          type: 'text',  required: false, placeholder: '011-12345678' },
  { name: 'email',          label: 'Email',          type: 'email', required: false, placeholder: 'info@publisher.com',
    validate: v => v && !isValidEmail(v) ? 'Enter a valid email address.' : null },
];

const PUBLISHER_COLUMNS = [
  { key: 'publisher_id',   label: 'ID',   sortable: true },
  { key: 'publisher_name', label: 'Name', sortable: true },
  { key: 'address',        label: 'Address', render: r => r.address || '—' },
  { key: 'phone',          label: 'Phone',   render: r => r.phone   || '—' },
  { key: 'email',          label: 'Email',   render: r => r.email   || '—' },
];

function renderPublishers() {
  renderCrudPage({
    table:    'publishers',
    title:    'Publishers',
    subtitle: 'Manage book publisher records',
    icon:     '🏢',
    pkField:  'publisher_id',
    columns:  PUBLISHER_COLUMNS,
    fields:   PUBLISHER_FIELDS,
    addLabel: 'Add Publisher',
    canDelete(row) {
      const inUse = db.getAll('books').some(b => b.publisher_id === row.publisher_id);
      return inUse ? 'Cannot delete: publisher is referenced by one or more books.' : true;
    },
  });
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: categories.js — Categories CRUD page.
   ════════════════════════════════════════════════════════════════════════ */

const CATEGORY_FIELDS = [
  { name: 'category_name', label: 'Category Name', type: 'text',     required: true,  placeholder: 'e.g. Computer Science', span: 2 },
  { name: 'description',   label: 'Description',   type: 'textarea', required: false, placeholder: 'Brief description…',    span: 2 },
];

const CATEGORY_COLUMNS = [
  { key: 'category_id',   label: 'ID',          sortable: true },
  { key: 'category_name', label: 'Name',        sortable: true },
  { key: 'description',   label: 'Description', render: r => r.description || '—' },
  {
    key: 'book_count',
    label: 'Books',
    sortable: false,
    render: r => {
      const count = db.getAll('books').filter(b => b.category_id === r.category_id).length;
      return `<span class="badge badge-accent">${count}</span>`;
    },
  },
];

function renderCategories() {
  renderCrudPage({
    table:    'categories',
    title:    'Categories',
    subtitle: 'Manage book categories and genres',
    icon:     '🏷️',
    pkField:  'category_id',
    columns:  CATEGORY_COLUMNS,
    fields:   CATEGORY_FIELDS,
    addLabel: 'Add Category',
    canDelete(row) {
      const inUse = db.getAll('books').some(b => b.category_id === row.category_id);
      return inUse ? 'Cannot delete: category contains one or more books.' : true;
    },
  });
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: copies.js — Book Copies CRUD page.
   ════════════════════════════════════════════════════════════════════════ */

function bookOptions() {
  return db.getAll('books').map(b => ({ value: b.book_id, label: `[${b.book_id}] ${b.title}` }));
}

const COPY_FIELDS = [
  {
    name: 'book_id', label: 'Book', type: 'select', required: true, span: 2,
    options: [],
  },
  {
    name: 'book_condition', label: 'Condition', type: 'select', required: true,
    options: ['Good', 'Fair', 'Poor'],
  },
  {
    name: 'is_available', label: 'Availability', type: 'select', required: true,
    options: [{ value: 1, label: 'Available' }, { value: 0, label: 'Issued / Unavailable' }],
    default: 1,
  },
];

function resolvedCopyFields() {
  return COPY_FIELDS.map(f => f.name === 'book_id' ? { ...f, options: bookOptions() } : f);
}

const COPY_COLUMNS = [
  { key: 'copy_id',        label: 'Copy ID',   sortable: true },
  { key: 'book_title',     label: 'Book',      sortable: true,  render: r => getBookTitle(r.book_id) },
  { key: 'book_id',        label: 'Book ID',   sortable: true },
  { key: 'book_condition', label: 'Condition', sortable: true,  render: r => statusBadge(r.book_condition) },
  {
    key: 'is_available',
    label: 'Status',
    sortable: true,
    render: r => r.is_available
      ? '<span class="badge badge-success">Available</span>'
      : '<span class="badge badge-danger">Issued</span>',
  },
];

function renderCopies() {
  renderCrudPage({
    table:    'copies',
    title:    'Book Copies',
    subtitle: 'Track physical copies of each book',
    icon:     '📦',
    pkField:  'copy_id',
    columns:  COPY_COLUMNS,
    fields:   resolvedCopyFields(),
    addLabel: 'Add Copy',

    beforeSave(data) {
      data.book_id      = Number(data.book_id);
      data.is_available = Number(data.is_available);
      return data;
    },

    canDelete(row) {
      const inUse = db.getAll('transactions').some(
        t => t.copy_id === row.copy_id && (t.status === 'Issued' || t.status === 'Overdue')
      );
      return inUse ? 'Cannot delete: copy is currently issued to a member.' : true;
    },
  });
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: members.js — Members CRUD page.
   ════════════════════════════════════════════════════════════════════════ */

const MEMBER_FIELDS = [
  { name: 'first_name',        label: 'First Name',       type: 'text',  required: true },
  { name: 'last_name',         label: 'Last Name',        type: 'text',  required: true },
  { name: 'email',             label: 'Email',            type: 'email', required: true, span: 2,
    validate: v => !isValidEmail(v) ? 'Enter a valid email address.' : null },
  { name: 'phone',             label: 'Phone',            type: 'text',  required: false,
    validate: v => v && !isValidPhone(v) ? 'Enter a valid 10-digit phone number.' : null },
  { name: 'address',           label: 'Address',          type: 'text',  required: false },
  { name: 'membership_date',   label: 'Membership Date',  type: 'date',  required: true },
  // BUGFIX (#5): the form previously let membership_expiry be set to the
  // same date as, or earlier than, membership_date. Added cross-field
  // validation (reads the sibling field's live DOM value, since the
  // modal's `validate` callback only receives this field's own value).
  { name: 'membership_expiry', label: 'Membership Expiry',type: 'date',  required: true,
    validate: v => {
      const startEl = document.getElementById('f-membership_date');
      if (startEl && startEl.value && v <= startEl.value) {
        return 'Membership expiry must be after the membership date.';
      }
      return null;
    }
  },
];

const MEMBER_COLUMNS = [
  { key: 'member_id',  label: 'ID',      sortable: true },
  { key: 'name',       label: 'Name',    sortable: true,  render: r => `${r.first_name} ${r.last_name}` },
  { key: 'email',      label: 'Email',   sortable: true },
  { key: 'phone',      label: 'Phone',   render: r => r.phone || '—' },
  { key: 'membership_expiry', label: 'Expires', sortable: true, render: r => formatDate(r.membership_expiry) },
  {
    key: 'status',
    label: 'Status',
    sortable: false,
    render: r => statusBadge(membershipStatus(r)),
  },
  {
    key: 'borrows',
    label: 'Active',
    sortable: false,
    render: r => {
      const n = getMemberActiveBorrows(r.member_id);
      return n > 0 ? `<span class="badge badge-warning">${n} out</span>` : `<span class="badge badge-muted">0</span>`;
    },
  },
  {
    key: 'unpaid',
    label: 'Unpaid Fine',
    sortable: false,
    render: r => {
      const amt = getMemberUnpaidFines(r.member_id);
      return amt > 0
        ? `<span class="text-danger" style="font-weight:600;font-family:var(--font-mono)">${formatRupees(amt)}</span>`
        : `<span class="text-muted">—</span>`;
    },
  },
];

function renderMembers() {
  renderCrudPage({
    table:    'members',
    title:    'Members',
    subtitle: 'Manage library member registrations',
    icon:     '👥',
    pkField:  'member_id',
    columns:  MEMBER_COLUMNS,
    fields:   MEMBER_FIELDS,
    addLabel: 'Add Member',

    canDelete(row) {
      const hasTransactions = db.getAll('transactions').some(t => t.member_id === row.member_id);
      return hasTransactions ? 'Cannot delete: member has transaction history.' : true;
    },
  });
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: librarians.js — Librarians CRUD page.
   ════════════════════════════════════════════════════════════════════════ */

const LIBRARIAN_FIELDS = [
  { name: 'first_name', label: 'First Name', type: 'text',  required: true },
  { name: 'last_name',  label: 'Last Name',  type: 'text',  required: true },
  { name: 'email',      label: 'Email',      type: 'email', required: true, span: 2,
    validate: v => !isValidEmail(v) ? 'Enter a valid email address.' : null },
  { name: 'phone',      label: 'Phone',      type: 'text',  required: false,
    validate: v => v && !isValidPhone(v) ? 'Enter a valid 10-digit phone number.' : null },
  { name: 'hire_date',  label: 'Hire Date',  type: 'date',  required: true },
];

const LIBRARIAN_COLUMNS = [
  { key: 'librarian_id', label: 'ID',         sortable: true },
  { key: 'name',         label: 'Name',       sortable: true,  render: r => `${r.first_name} ${r.last_name}` },
  { key: 'email',        label: 'Email',      sortable: true },
  { key: 'phone',        label: 'Phone',      render: r => r.phone || '—' },
  { key: 'hire_date',    label: 'Hire Date',  sortable: true,  render: r => formatDate(r.hire_date) },
  {
    key: 'transactions',
    label: 'Transactions',
    sortable: false,
    render: r => {
      const count = db.getAll('transactions').filter(t => t.librarian_id === r.librarian_id).length;
      return `<span class="badge badge-accent">${count}</span>`;
    },
  },
];

function renderLibrarians() {
  renderCrudPage({
    table:    'librarians',
    title:    'Librarians',
    subtitle: 'Manage library staff records',
    icon:     '🧑‍💼',
    pkField:  'librarian_id',
    columns:  LIBRARIAN_COLUMNS,
    fields:   LIBRARIAN_FIELDS,
    addLabel: 'Add Librarian',

    canDelete(row) {
      const inUse = db.getAll('transactions').some(t => t.librarian_id === row.librarian_id);
      return inUse ? 'Cannot delete: librarian has processed transactions.' : true;
    },
  });
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: transactions.js — Issue Transactions page.
   ════════════════════════════════════════════════════════════════════════ */

// BUGFIX (#9 / dedupe): memberOptions() and librarianOptions() used to be
// defined twice — once in the old fines.js and once in the old
// transactions.js — with identical bodies. They're now shared.
function memberOptions() {
  return db.getAll('members').map(m => ({ value: m.member_id, label: `[${m.member_id}] ${m.first_name} ${m.last_name}` }));
}
function librarianOptions() {
  return db.getAll('librarians').map(l => ({ value: l.librarian_id, label: `[${l.librarian_id}] ${l.first_name} ${l.last_name}` }));
}
function copyOptions() {
  return db.getAll('copies')
    .filter(c => c.is_available)
    .map(c => {
      const titleStr = db.getById('books', c.book_id)?.title ?? 'Unknown';
      return { value: c.copy_id, label: `Copy #${c.copy_id} — ${titleStr} (${c.book_condition})` };
    });
}

// BUGFIX (#3): the Issue form used to include a "Status" select offering
// Issued / Returned / Overdue at *creation* time, with no return_date
// field anywhere on the form. Picking "Returned" produced a transaction
// flagged Returned with return_date stuck at null forever. A new issue
// transaction should always start as 'Issued' — returns are handled by
// the dedicated Return flow below — so the field has been removed and
// status is now hardcoded in handleIssue().
const ISSUE_FIELDS = () => [
  { name: 'copy_id',      label: 'Book Copy',  type: 'select', required: true, options: copyOptions(), span: 2 },
  { name: 'member_id',    label: 'Member',     type: 'select', required: true, options: memberOptions() },
  { name: 'librarian_id', label: 'Librarian',  type: 'select', required: true, options: librarianOptions() },
  { name: 'issue_date',   label: 'Issue Date', type: 'date',   required: true, default: today() },
  { name: 'due_date',     label: 'Due Date',   type: 'date',   required: true, default: addDays(today(), 14) },
];

const TXN_COLUMNS = [
  { key: 'transaction_id', label: 'ID',          sortable: true },
  { key: 'book_title',     label: 'Book',         sortable: true,  render: r => getBookTitleByCopy(r.copy_id) },
  { key: 'copy_id',        label: 'Copy',         sortable: true,  render: r => `#${r.copy_id}` },
  { key: 'member',         label: 'Member',       sortable: false, render: r => getMemberName(r.member_id) },
  { key: 'librarian',      label: 'Librarian',    sortable: false, render: r => getLibrarianName(r.librarian_id) },
  { key: 'issue_date',     label: 'Issued',       sortable: true,  render: r => formatDate(r.issue_date) },
  { key: 'due_date',       label: 'Due',          sortable: true,  render: r => formatDate(r.due_date) },
  { key: 'return_date',    label: 'Returned',     sortable: true,  render: r => formatDate(r.return_date) },
  { key: 'status',         label: 'Status',       sortable: true,  render: r => statusBadge(r.status) },
];

function renderTransactions() {
  const content = document.getElementById('app-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Transactions</h1>
        <p class="page-header__subtitle">Manage book issue and return transactions</p>
      </div>
      <div class="page-header__actions">
        <button class="btn btn-secondary" id="return-btn">Process Return</button>
        <button class="btn btn-primary" id="issue-btn">Issue Book</button>
      </div>
    </div>
    <div class="card">
      <div id="txn-table-container"></div>
    </div>
  `;

  const tableContainer = content.querySelector('#txn-table-container');
  let tableInstance;

  function getDisplayData() {
    return db.getAll('transactions').slice().reverse();
  }

  function buildActions(row) {
    const canReturn = row.status !== 'Returned';
    return `
      ${canReturn ? `<button class="btn btn-success btn-sm" data-action="return" data-id="${row.transaction_id}">Return</button>` : ''}
      <button class="btn btn-danger btn-sm" data-action="delete" data-id="${row.transaction_id}">Delete</button>
    `;
  }

  function renderTxnTable() {
    tableInstance = renderTable(tableContainer, {
      columns: TXN_COLUMNS,
      data: getDisplayData(),
      actions: buildActions,
      emptyMsg: 'No transactions yet.',
    });

    tableContainer.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'return') handleReturn(id);
      if (action === 'delete') handleDeleteTxn(id);
    });
  }

  async function handleIssue() {
    const fields = ISSUE_FIELDS();
    if (fields[0].options.length === 0) {
      showToast('No available copies at the moment.', 'warning');
      return;
    }
    const result = await openModal({ title: 'Issue Book', fields, submitLabel: 'Issue Book' });
    if (!result) return;

    result.copy_id      = Number(result.copy_id);
    result.member_id    = Number(result.member_id);
    result.librarian_id = Number(result.librarian_id);
    result.return_date  = null;
    result.status       = 'Issued'; // BUGFIX (#3): always start as Issued

    // BUGFIX (#4): membership expiry was never checked before issuing,
    // despite being a documented project rule.
    const member = db.getById('members', result.member_id);
    if (member && member.membership_expiry < today()) {
      showToast(`Cannot issue: ${member.first_name} ${member.last_name}'s membership has expired.`, 'error');
      return;
    }

    const active = db.getAll('transactions').filter(
      t => t.member_id === result.member_id && (t.status === 'Issued' || t.status === 'Overdue')
    ).length;
    if (active >= 3) {
      showToast('Member already has 3 books issued. Return one before issuing more.', 'error');
      return;
    }

    db.create('transactions', result);
    db.update('copies', result.copy_id, { is_available: 0 });
    saveDatabase();
    showToast('Book issued successfully.', 'success');
    tableInstance.refresh(getDisplayData());
  }

  async function handleReturn(id) {
    const txn = db.getById('transactions', id);
    if (!txn) return;

    const result = await openModal({
      title: `Process Return — Transaction #${id}`,
      fields: [
        { name: 'return_date', label: 'Return Date', type: 'date', required: true, default: today() },
        { name: 'status', label: 'Status', type: 'select', required: true,
          options: ['Returned', 'Issued', 'Overdue'], default: 'Returned' },
      ],
      data: txn,
      submitLabel: 'Confirm Return',
    });
    if (!result) return;

    db.update('transactions', id, {
      return_date: result.return_date || today(),
      status: result.status || 'Returned',
    });
    db.update('copies', txn.copy_id, { is_available: 1 });

    const updatedTxn = db.getById('transactions', id);
    if (updatedTxn.return_date > updatedTxn.due_date) {
      const days    = Math.round((new Date(updatedTxn.return_date) - new Date(updatedTxn.due_date)) / 86400000);
      const fineAmt = days * 2;
      const existing = db.getAll('fines').find(f => f.transaction_id === Number(id));
      if (!existing && fineAmt > 0) {
        db.create('fines', {
          transaction_id: Number(id),
          member_id:   txn.member_id,
          fine_amount: fineAmt,
          paid_status: 'Unpaid',
          fine_date:   updatedTxn.return_date,
        });
        showToast(`Returned late. Fine of ₹${fineAmt} recorded.`, 'warning');
      } else {
        showToast('Book returned.', 'success');
      }
    } else {
      showToast('Book returned on time.', 'success');
    }

    saveDatabase();
    tableInstance.refresh(getDisplayData());
  }

  async function handleDeleteTxn(id) {
    const txn = db.getById('transactions', id);
    if (!txn) return;
    if (txn.status === 'Issued' || txn.status === 'Overdue') {
      showToast('Cannot delete an active transaction. Process the return first.', 'error');
      return;
    }
    const confirmed = await openConfirm({
      title: 'Delete Transaction',
      message: 'Delete this transaction record? <strong>This cannot be undone.</strong>',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;

    db.getAll('fines')
      .filter(f => f.transaction_id === Number(id))
      .forEach(f => db.delete('fines', f.fine_id));

    db.delete('transactions', id);
    saveDatabase();
    showToast('Transaction deleted.', 'info');
    tableInstance.refresh(getDisplayData());
  }

  content.querySelector('#issue-btn').addEventListener('click', handleIssue);
  content.querySelector('#return-btn').addEventListener('click', () => {
    const active = db.getAll('transactions').find(t => t.status === 'Issued' || t.status === 'Overdue');
    if (active) handleReturn(active.transaction_id);
    else showToast('No active transactions to return.', 'info');
  });

  renderTxnTable();
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: fines.js — Fines management page.
   ════════════════════════════════════════════════════════════════════════ */

function txnOptions() {
  return db.getAll('transactions').map(t => {
    const titleStr = getBookTitleByCopy(t.copy_id);
    return { value: t.transaction_id, label: `#${t.transaction_id} — ${titleStr} (${t.status})` };
  });
}

const ADD_FINE_FIELDS = () => [
  { name: 'transaction_id', label: 'Transaction', type: 'select', required: true, options: txnOptions(), span: 2 },
  { name: 'member_id',      label: 'Member',      type: 'select', required: true, options: memberOptions() },
  { name: 'fine_amount',    label: 'Fine Amount (₹)', type: 'number', required: true, min: '0', step: '0.01', placeholder: '0.00' },
  { name: 'paid_status',    label: 'Paid Status', type: 'select', required: true,
    options: ['Unpaid', 'Paid'], default: 'Unpaid' },
  { name: 'fine_date',      label: 'Fine Date',   type: 'date',   required: true, default: today() },
];

const FINE_COLUMNS = [
  { key: 'fine_id',       label: 'ID',         sortable: true },
  { key: 'transaction',   label: 'Transaction', sortable: false, render: r => `#${r.transaction_id}` },
  { key: 'book',          label: 'Book',        sortable: false,
    render: r => {
      const txn = db.getById('transactions', r.transaction_id);
      return txn ? getBookTitleByCopy(txn.copy_id) : '—';
    }
  },
  { key: 'member',        label: 'Member',     sortable: false, render: r => getMemberName(r.member_id) },
  { key: 'fine_amount',   label: 'Amount',     sortable: true,
    render: r => `<span style="font-family:var(--font-mono);font-weight:600;color:var(--warning)">${formatRupees(r.fine_amount)}</span>` },
  { key: 'paid_status',   label: 'Status',     sortable: true, render: r => statusBadge(r.paid_status) },
  { key: 'fine_date',     label: 'Date',       sortable: true, render: r => formatDate(r.fine_date) },
];

function renderFines() {
  const content = document.getElementById('app-content');
  if (!content) return;

  const unpaidTotal = db.getAll('fines')
    .filter(f => f.paid_status === 'Unpaid')
    .reduce((s, f) => s + Number(f.fine_amount), 0);
  const paidTotal = db.getAll('fines')
    .filter(f => f.paid_status === 'Paid')
    .reduce((s, f) => s + Number(f.fine_amount), 0);

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Fines</h1>
        <p class="page-header__subtitle">Track and manage overdue book fines (₹2 per day)</p>
      </div>
      <div class="page-header__actions">
        <span style="font-size:12.5px;color:var(--text-muted)">
          Unpaid: <strong style="color:var(--danger)">${formatRupees(unpaidTotal)}</strong>
          &nbsp;&middot;&nbsp;
          Collected: <strong style="color:var(--success)">${formatRupees(paidTotal)}</strong>
        </span>
        <button class="btn btn-primary" id="fine-add-btn">Add Fine</button>
      </div>
    </div>
    <div class="card">
      <div id="fines-table-container"></div>
    </div>
  `;

  const tableContainer = content.querySelector('#fines-table-container');
  let tableInstance;

  function getDisplayData() {
    return db.getAll('fines').slice().reverse();
  }

  function buildActions(row) {
    const canPay = row.paid_status === 'Unpaid';
    return `
      ${canPay ? `<button class="btn btn-success btn-sm" data-action="pay" data-id="${row.fine_id}">Mark Paid</button>` : ''}
      <button class="btn btn-danger btn-sm" data-action="delete" data-id="${row.fine_id}">Delete</button>
    `;
  }

  function renderFinesTable() {
    tableInstance = renderTable(tableContainer, {
      columns: FINE_COLUMNS,
      data: getDisplayData(),
      actions: buildActions,
      emptyMsg: 'No fines recorded.',
    });

    tableContainer.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'pay')    handleMarkPaid(btn.dataset.id);
      if (btn.dataset.action === 'delete') handleDeleteFine(btn.dataset.id);
    });
  }

  async function handleAddFine() {
    const fields = ADD_FINE_FIELDS();
    const result = await openModal({ title: 'Add Fine', fields, submitLabel: 'Add Fine' });
    if (!result) return;

    result.transaction_id = Number(result.transaction_id);
    result.member_id      = Number(result.member_id);
    result.fine_amount    = Number(result.fine_amount);

    db.create('fines', result);
    saveDatabase();
    showToast('Fine added.', 'success');
    tableInstance.refresh(getDisplayData());
  }

  async function handleMarkPaid(id) {
    const confirmed = await openConfirm({
      title: 'Mark Fine as Paid',
      message: 'Mark this fine as <strong>Paid</strong>?',
      confirmLabel: 'Confirm Payment',
      danger: false,
    });
    if (!confirmed) return;
    db.update('fines', id, { paid_status: 'Paid' });
    saveDatabase();
    showToast('Fine marked as paid.', 'success');
    tableInstance.refresh(getDisplayData());
  }

  async function handleDeleteFine(id) {
    const confirmed = await openConfirm({
      title: 'Delete Fine',
      message: 'Delete this fine record? <strong>This cannot be undone.</strong>',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;
    db.delete('fines', id);
    saveDatabase();
    showToast('Fine deleted.', 'info');
    tableInstance.refresh(getDisplayData());
  }

  content.querySelector('#fine-add-btn').addEventListener('click', handleAddFine);
  renderFinesTable();
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: reports.js — Reports & Analytics page.
   ════════════════════════════════════════════════════════════════════════ */

const REPORT_TABS = [
  { id: 'overdue',    label: 'Overdue Books' },
  { id: 'fines',      label: 'Fine Summary' },
  { id: 'category',   label: 'By Category' },
  { id: 'publisher',  label: 'By Publisher' },
  { id: 'member',     label: 'Member Activity' },
  { id: 'librarian',  label: 'Librarian Stats' },
];

function renderReports() {
  const content = document.getElementById('app-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Reports</h1>
        <p class="page-header__subtitle">Analytics and summary reports for the library</p>
      </div>
    </div>

    <div class="report-tabs">
      ${REPORT_TABS.map((t, i) => `
        <button class="btn ${i === 0 ? 'btn-primary' : 'btn-secondary'} btn-sm" data-report="${t.id}">${t.label}</button>
      `).join('')}
    </div>

    <div class="card" style="margin-top:16px">
      <div id="report-table-container"></div>
    </div>
  `;

  const container  = content.querySelector('#report-table-container');
  let activeReport = 'overdue';

  function setActive(tab) {
    activeReport = tab;
    content.querySelectorAll('[data-report]').forEach(btn => {
      btn.className = `btn ${btn.dataset.report === tab ? 'btn-primary' : 'btn-secondary'} btn-sm`;
    });
    renderReport(tab);
  }

  content.querySelectorAll('[data-report]').forEach(btn => {
    btn.addEventListener('click', () => setActive(btn.dataset.report));
  });

  function renderReport(type) {
    switch (type) {
      case 'overdue':   renderOverdueReport();   break;
      case 'fines':     renderFinesReport();     break;
      case 'category':  renderCategoryReport();  break;
      case 'publisher': renderPublisherReport(); break;
      case 'member':    renderMemberReport();    break;
      case 'librarian': renderLibrarianReport(); break;
    }
  }

  function renderOverdueReport() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const overdue = db.getAll('transactions').filter(t => t.status === 'Overdue').map(t => {
      const daysOverdue = Math.round((new Date(todayStr) - new Date(t.due_date)) / 86400000);
      return { ...t, memberName: getMemberName(t.member_id), bookTitle: getBookTitleByCopy(t.copy_id), daysOverdue, estimatedFine: daysOverdue * 2 };
    }).sort((a, b) => b.daysOverdue - a.daysOverdue);

    renderTable(container, {
      columns: [
        { key: 'transaction_id', label: 'Txn #',       sortable: true },
        { key: 'bookTitle',      label: 'Book',         sortable: true,  render: r => r.bookTitle },
        { key: 'memberName',     label: 'Member',       sortable: true,  render: r => r.memberName },
        { key: 'due_date',       label: 'Due Date',     sortable: true,  render: r => formatDate(r.due_date) },
        { key: 'daysOverdue',    label: 'Days Overdue', sortable: true,
          render: r => `<span class="badge badge-danger">${r.daysOverdue} days</span>` },
        { key: 'estimatedFine',  label: 'Est. Fine',    sortable: true,
          render: r => `<span style="color:var(--warning);font-weight:600;font-family:var(--font-mono)">${formatRupees(r.estimatedFine)}</span>` },
      ],
      data: overdue,
      emptyMsg: 'No overdue books.',
    });
  }

  function renderFinesReport() {
    const fines = db.getAll('fines').map(f => {
      const txn = db.getById('transactions', f.transaction_id);
      return { ...f, memberName: getMemberName(f.member_id), bookTitle: txn ? getBookTitleByCopy(txn.copy_id) : '—' };
    });

    const total  = fines.reduce((s, f) => s + Number(f.fine_amount), 0);
    const paid   = fines.filter(f => f.paid_status === 'Paid').reduce((s, f) => s + Number(f.fine_amount), 0);
    const unpaid = total - paid;

    const summary = document.createElement('div');
    summary.style.cssText = 'display:flex;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border);flex-wrap:wrap';
    summary.innerHTML = [
      { label: 'Total Fines',  value: fines.length },
      { label: 'Total Amount', value: formatRupees(total) },
      { label: 'Collected',    value: formatRupees(paid),   color: 'var(--success)' },
      { label: 'Pending',      value: formatRupees(unpaid), color: 'var(--danger)' },
    ].map(s => `
      <div style="background:var(--bg-app);border-radius:var(--radius-sm);padding:10px 14px;border:1px solid var(--border);min-width:110px">
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px">${s.label}</div>
        <div style="font-size:17px;font-weight:700;color:${s.color || 'var(--text-primary)'};font-family:var(--font-mono)">${s.value}</div>
      </div>
    `).join('');

    container.innerHTML = '';
    container.appendChild(summary);

    const tableDiv = document.createElement('div');
    container.appendChild(tableDiv);

    renderTable(tableDiv, {
      columns: [
        { key: 'fine_id',     label: 'ID',     sortable: true },
        { key: 'memberName',  label: 'Member', sortable: true, render: r => r.memberName },
        { key: 'bookTitle',   label: 'Book',   sortable: true, render: r => r.bookTitle },
        { key: 'fine_amount', label: 'Amount', sortable: true,
          render: r => `<span style="font-family:var(--font-mono);font-weight:600">${formatRupees(r.fine_amount)}</span>` },
        { key: 'paid_status', label: 'Status', sortable: true, render: r => statusBadge(r.paid_status) },
        { key: 'fine_date',   label: 'Date',   sortable: true, render: r => formatDate(r.fine_date) },
      ],
      data: fines,
      emptyMsg: 'No fines recorded.',
    });
  }

  function renderCategoryReport() {
    renderTable(container, {
      columns: [
        { key: 'category_id',   label: 'ID',          sortable: true },
        { key: 'category_name', label: 'Category',    sortable: true },
        { key: 'description',   label: 'Description', render: r => r.description || '—' },
        { key: 'bookCount', label: 'Books', sortable: true,
          render: r => `<span class="badge badge-muted">${r.bookCount}</span>` },
      ],
      data: getCategoryBookCounts(),
      emptyMsg: 'No categories.',
    });
  }

  function renderPublisherReport() {
    renderTable(container, {
      columns: [
        { key: 'publisher_id',   label: 'ID',        sortable: true },
        { key: 'publisher_name', label: 'Publisher', sortable: true },
        { key: 'phone',          label: 'Phone',     render: r => r.phone || '—' },
        { key: 'bookCount', label: 'Books', sortable: true,
          render: r => `<span class="badge badge-muted">${r.bookCount}</span>` },
      ],
      data: getPublisherBookCounts(),
      emptyMsg: 'No publishers.',
    });
  }

  function renderMemberReport() {
    const data = getMemberBorrowingSummary().sort((a, b) => b.totalTransactions - a.totalTransactions);
    renderTable(container, {
      columns: [
        { key: 'member_id',         label: 'ID',       sortable: true },
        { key: 'fullName',          label: 'Member',   sortable: true, render: r => r.fullName },
        { key: 'email',             label: 'Email',    sortable: true },
        { key: 'totalTransactions', label: 'Borrows',  sortable: true,
          render: r => `<span class="badge badge-accent">${r.totalTransactions}</span>` },
        { key: 'overdueCount',      label: 'Overdue',  sortable: true,
          render: r => r.overdueCount > 0
            ? `<span class="badge badge-danger">${r.overdueCount}</span>`
            : `<span class="badge badge-muted">0</span>` },
        { key: 'unpaidFines',       label: 'Unpaid',   sortable: true,
          render: r => r.unpaidFines > 0
            ? `<span style="color:var(--danger);font-weight:600;font-family:var(--font-mono)">${formatRupees(r.unpaidFines)}</span>`
            : '<span style="color:var(--text-muted)">—</span>' },
        { key: 'memberStatus', label: 'Status', sortable: true, render: r => statusBadge(r.memberStatus) },
      ],
      data,
      emptyMsg: 'No members.',
    });
  }

  function renderLibrarianReport() {
    const librarians   = db.getAll('librarians');
    const transactions = db.getAll('transactions');
    const data = librarians.map(l => {
      const txns = transactions.filter(t => t.librarian_id === l.librarian_id);
      return {
        ...l,
        fullName:          `${l.first_name} ${l.last_name}`,
        totalTransactions: txns.length,
        returnedCount:     txns.filter(t => t.status === 'Returned').length,
        overdueCount:      txns.filter(t => t.status === 'Overdue').length,
      };
    }).sort((a, b) => b.totalTransactions - a.totalTransactions);

    renderTable(container, {
      columns: [
        { key: 'librarian_id',      label: 'ID',         sortable: true },
        { key: 'fullName',          label: 'Librarian',  sortable: true, render: r => r.fullName },
        { key: 'hire_date',         label: 'Hired',      sortable: true, render: r => formatDate(r.hire_date) },
        { key: 'totalTransactions', label: 'Total Txns', sortable: true,
          render: r => `<span class="badge badge-accent">${r.totalTransactions}</span>` },
        { key: 'returnedCount',     label: 'Returns',    sortable: true,
          render: r => `<span class="badge badge-success">${r.returnedCount}</span>` },
        { key: 'overdueCount',      label: 'Overdue',    sortable: true,
          render: r => r.overdueCount > 0
            ? `<span class="badge badge-danger">${r.overdueCount}</span>`
            : `<span class="badge badge-muted">0</span>` },
      ],
      data,
      emptyMsg: 'No librarians.',
    });
  }

  renderReport(activeReport);
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION: app.js entry point — wires together router, pages, nav, theme,
   storage. (Equivalent to the old app.js, now the bottom of the bundle.)
   ════════════════════════════════════════════════════════════════════════ */

/* ── STORAGE ─────────────────────────────────────────────── */
loadDatabase();

/* ── THEME ───────────────────────────────────────────────── */
initTheme();

document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);

/* ── ROUTES ──────────────────────────────────────────────── */
addRoute('dashboard',    renderDashboard);
addRoute('books',        renderBooks);
addRoute('authors',      renderAuthors);
addRoute('publishers',   renderPublishers);
addRoute('categories',   renderCategories);
addRoute('copies',       renderCopies);
addRoute('members',      renderMembers);
addRoute('librarians',   renderLibrarians);
addRoute('transactions', renderTransactions);
addRoute('fines',        renderFines);
addRoute('reports',      renderReports);

setNotFound(route => {
  const content = document.getElementById('app-content');
  if (content) {
    content.innerHTML = `
      <div class="empty-state" style="margin-top:60px">
        <div class="empty-state__icon">🔍</div>
        <h2 class="empty-state__title">Page Not Found</h2>
        <p class="empty-state__message">The route "<strong>${route}</strong>" does not exist.</p>
        <button class="btn btn-primary" onclick="location.hash='dashboard'">Go to Dashboard</button>
      </div>
    `;
  }
});

/* ── NAVIGATION ──────────────────────────────────────────── */
initResponsiveNav();

onRouteChange(route => {
  navOnRouteChange();
});

/* ── NAV ITEM CLICK → NAVIGATE ───────────────────────────── */
document.querySelectorAll('.nav-item[data-route]').forEach(item => {
  item.addEventListener('click', () => {
    navigate(item.dataset.route);
  });
  item.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(item.dataset.route);
    }
  });
});

/* ── START ROUTER ────────────────────────────────────────── */
startRouter();
