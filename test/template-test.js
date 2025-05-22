#!/usr/bin/env node

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// Test configuration
const API_URL = 'http://localhost:5000';
const TOKEN = 'dummy-token'; // Replace with a valid token in real tests

// Helper functions
async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    ...(options.headers || {})
  };

  return fetch(url, {
    ...options,
    headers
  });
}

// Test functions
async function testGetTemplates() {
  console.log('Testing GET templates endpoint...');
  
  const response = await fetchWithAuth(`${API_URL}/api/admin/templates`);
  const data = await response.json();
  
  console.log('Response:', {
    status: response.status,
    data
  });
  
  return data;
}

async function testTemplateMatch(docxPath) {
  console.log('Testing template matching endpoint...');
  
  const response = await fetchWithAuth(`${API_URL}/api/admin/templates/match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ docxPath })
  });
  
  const data = await response.json();
  
  console.log('Template match response:', {
    status: response.status,
    data
  });
  
  return data;
}

// Main test flow
async function runTests() {
  try {
    console.log('=== Starting template API tests ===');
    
    // Test 1: Get templates
    const templates = await testGetTemplates();
    
    // More tests can be added here as the template feature develops
    
    console.log('=== All tests completed ===');
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the tests
runTests();