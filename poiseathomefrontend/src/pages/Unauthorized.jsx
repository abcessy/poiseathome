import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => (
  <div className="flex min-h-screen items-center justify-center bg-background px-4">
    <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center">
      <p className="mb-2 text-sm font-semibold text-red-700">Access denied</p>
      <h1 className="page-title mb-3">You cannot view this page</h1>
      <p className="mb-7 text-sm text-gray-600">Your account does not have permission to open this area.</p>
      <Link to="/" className="btn-primary">Return home</Link>
    </div>
  </div>
);
export default Unauthorized;
