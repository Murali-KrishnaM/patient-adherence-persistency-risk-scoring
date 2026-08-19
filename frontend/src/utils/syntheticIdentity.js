// Deterministic, purely cosmetic synthetic identities for the simulated
// demo dataset. The same patient_id always produces the same name/phone
// /email, computed client-side from a hash of the ID — nothing here reads
// or touches real PII, and it never calls the backend.

const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Daniel', 'Nancy', 'Matthew', 'Lisa',
  'Anthony', 'Betty', 'Mark', 'Margaret', 'Donald', 'Sandra', 'Steven', 'Ashley',
  'Paul', 'Kimberly', 'Andrew', 'Emily', 'Joshua', 'Donna', 'Kenneth', 'Michelle',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
];

const EMAIL_DOMAINS = ['mailbox.com', 'webmail.org', 'inboxpro.net'];

// Simple deterministic string hash (djb2) — not cryptographic, just needs
// to be stable and spread out enough to pick list indexes.
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function getSyntheticIdentity(patientId) {
  const id = patientId || 'UNKNOWN';
  const h = hashString(id);

  const firstName = FIRST_NAMES[h % FIRST_NAMES.length];
  const lastName = LAST_NAMES[Math.floor(h / FIRST_NAMES.length) % LAST_NAMES.length];
  const fullName = `${firstName} ${lastName}`;

  const areaCode = 200 + (h % 800);
  const exchange = 100 + (Math.floor(h / 7) % 900);
  const lineNum = 1000 + (Math.floor(h / 13) % 9000);
  const phone = `(${areaCode}) ${exchange}-${lineNum}`;

  const domain = EMAIL_DOMAINS[Math.floor(h / 3) % EMAIL_DOMAINS.length];
  const emailNum = h % 100;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailNum}@${domain}`;

  return { name: fullName, phone, email };
}