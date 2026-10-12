import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Edit2, Trash2, X } from 'lucide-react';

export default function AdminDashboard() {
  const [students, setStudents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ student_id: null, register_no: '', full_name: '', batch_id: '' });
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');

  // Define the API URL with a local fallback for deployment compatibility
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const res = await fetch(`${API_URL}/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setStudents(await res.json());
    } else if (res.status === 401) {
      handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  const openModal = (student = null) => {
    // Ensure we are receiving a valid student object, not a browser Click Event
    if (student && !student.target) {
      setFormData(student);
    } else {
      setFormData({ student_id: null, register_no: '', full_name: '', batch_id: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = formData.student_id ? 'PUT' : 'POST';
    const url = formData.student_id
      ? `${API_URL}/students/${formData.student_id}`
      : `${API_URL}/students`;

    const payload = { ...formData };
    if (!formData.student_id) delete payload.student_id;

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setIsModalOpen(false);
      fetchStudents();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    const res = await fetch(`${API_URL}/students/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) fetchStudents();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-pink-50">Database Admin</h1>
        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition">
          <LogOut size={16} /> Logout
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-pink-100 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-pink-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200">Student Directory</h2>
          <button
            type="button"
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm"
          >
            <Plus size={16} /> Add Student
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400 text-sm">
                <th className="p-4 font-medium">Reg No</th>
                <th className="p-4 font-medium">Full Name</th>
                <th className="p-4 font-medium">Batch ID</th>
                <th className="p-4 font-medium text-right">Actions</th>