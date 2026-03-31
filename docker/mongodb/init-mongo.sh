#!/bin/sh
set -eu

echo "Starting MongoDB search bootstrap..."
sleep 2

mongosh --eval "
const adminDb = db.getSiblingDB('admin');
try {
  adminDb.createUser({
    user: 'mongotUser',
    pwd: 'mongotPassword',
    roles: [{ role: 'searchCoordinator', db: 'admin' }]
  });
  print('User mongotUser created successfully');
} catch (error) {
  if (error.code === 11000) {
    print('User mongotUser already exists');
  } else {
    throw error;
  }
}
"

echo "MongoDB search bootstrap completed."
