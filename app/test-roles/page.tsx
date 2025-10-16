"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TestRolesPage() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/profile/ingest');
      if (response.ok) {
        const data = await response.json();
        setUserInfo(data);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeRoles = async () => {
    try {
      const response = await fetch('/api/admin/init-roles', {
        method: 'POST',
      });
      const data = await response.json();
      alert(data.message || 'Roles initialized');
      fetchUserInfo();
    } catch (error) {
      alert('Error initializing roles');
    }
  };

  const setRole = async (userId: string, role: string) => {
    try {
      const response = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      const data = await response.json();
      alert(data.message || 'Role updated');
      fetchUserInfo();
    } catch (error) {
      alert('Error updating role');
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Role Management Test Page</h1>
      
      <div className="space-y-4">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Current User Info</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify(userInfo, null, 2)}
          </pre>
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Role Management</h2>
          <div className="space-y-2">
            <Button onClick={initializeRoles} className="mr-2">
              Initialize All Roles (set to 'user')
            </Button>
            <p className="text-sm text-gray-600">
              This will set all users without a role to 'user' by default.
            </p>
          </div>
        </Card>

        {userInfo && (
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-2">Change Current User Role</h2>
            <div className="space-x-2">
              <Button 
                onClick={() => setRole(userInfo.id, 'user')}
                variant={userInfo.role === 'user' ? 'default' : 'outline'}
              >
                Set as User
              </Button>
              <Button 
                onClick={() => setRole(userInfo.id, 'admin')}
                variant={userInfo.role === 'admin' ? 'default' : 'outline'}
              >
                Set as Admin
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Current role: <strong>{userInfo.role || 'Not set'}</strong>
            </p>
          </Card>
        )}

        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Test Navigation</h2>
          <div className="space-x-2">
            <Button onClick={() => window.location.href = '/dashboard'}>
              Go to Dashboard
            </Button>
            <Button onClick={() => window.location.href = '/admin'}>
              Go to Admin
            </Button>
            <Button onClick={() => window.location.href = '/'}>
              Go to Root
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Try navigating to different pages to test the role-based routing.
          </p>
        </Card>
      </div>
    </div>
  );
}
