-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view available properties" ON properties;

-- Create a new policy that properly allows public viewing of available properties
CREATE POLICY "Public can view available properties"
ON properties
FOR SELECT
TO anon, authenticated
USING (status = 'available');

-- Create a separate policy for admins and agents to view all properties
CREATE POLICY "Admins and agents can view all properties"
ON properties
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'agent'::app_role)
);