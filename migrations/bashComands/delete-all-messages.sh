#!/bin/bash

# This script deletes all records from the messages table in the D1 database.

wrangler d1 execute wam-business-db --command 'DELETE FROM messages;' --remote
