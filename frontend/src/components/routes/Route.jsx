import { createHashRouter, RouterProvider } from 'react-router-dom'  // changed from createBrowserRouter
import Home from '../views/home/Home'
import Addarea from '../views/addarea/AddArea'
import Addvillage from '../views/addvillage/AddVillage'
import Navbar from '../navbar/Index'
import Login from '../login/Login'
import Showuser from '../views/showuserdata/ShowUser'
import Printuser from '../views/printdata/PrintData'
import Adduser from '../views/adduserdata/AddUser'
import CreateReceipt from '../views/createreceipt/CreateReceipt'
import ModifyReceipt from '../views/modifyreceipt/ModifyReceipt'
import Reports from '../views/reports/Reports'
import UserManagement from '../views/admin/UserManagement'
import ProtectedRoute from '../auth/ProtectedRoute'

const router = createHashRouter(
  [
    {
      path: "/home",
      element:
        <ProtectedRoute>
          <Navbar />
          <Home />
        </ProtectedRoute>
    },
    {
      path: "/area",
      element:
        <ProtectedRoute>
          <Navbar />
          <Addarea />
        </ProtectedRoute>
    },
    {
      path: "/village",
      element:
        <ProtectedRoute>
          <Navbar />
          <Addvillage />
        </ProtectedRoute>
    },
    {
      path: "/user",
      element:
        <ProtectedRoute>
          <Navbar />
          <Adduser />
        </ProtectedRoute>
    },
    {
      path: "/showuser",
      element:
        <ProtectedRoute>
          <Navbar />
          <Showuser />
        </ProtectedRoute>
    },
    {
      path: "/receipts",
      element:
        <ProtectedRoute>
          <Navbar />
          <Printuser />
        </ProtectedRoute>
    },
    {
      path: "/create-receipt",
      element:
        <ProtectedRoute>
          <Navbar />
          <CreateReceipt />
        </ProtectedRoute>
    },
    {
      path: "/modify-receipt",
      element:
        <ProtectedRoute>
          <Navbar />
          <ModifyReceipt />
        </ProtectedRoute>
    },
    {
      path: "/reports",
      element:
        <ProtectedRoute>
          <Navbar />
          <Reports />
        </ProtectedRoute>
    },
    {
      path: "/admin/users",
      element:
        <ProtectedRoute>
          <Navbar />
          <UserManagement />
        </ProtectedRoute>
    },
    {
      path: "/",
      element:
        <div>
          <Login />
        </div>
    },
    {
      path: "*",
      element:
        <div>
          <Login />
        </div>
    }
  ]
)

const Routerall = () => {
  return (
    <div>
      <RouterProvider router={router} />
    </div>
  )
}

export default Routerall
