import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Edit2, Trash2, X, Home } from 'lucide-react';

export default function AdminDashboard() {
  const [students, setStudents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ student_id: null, register_no: '', full_name: '', batch_id: '' });
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white dark:bg-gray-900 border border-pink-200 dark:border-gray-800 rounded-lg hover:bg-pink-50 dark:hover:bg-gray-800 transition shadow-sm"
          >
            <Home size={16} /> Home
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-pink-100 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-pink-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200">Student Directory</h2>
          <button type="button" onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50 dark:divide-gray-800">
              {students.map(s => (
                <tr key={s.student_id} className="hover:bg-pink-50/50 dark:hover:bg-gray-800/50 transition">
                  <td className="p-4 text-gray-800 dark:text-gray-200">{s.register_no}</td>
                  <td className="p-4 text-gray-800 dark:text-gray-200 font-medium">{s.full_name}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{s.batch_id}</td>
                  <td className="p-4 flex justify-end gap-3">
                    <button onClick={() => openModal(s)} className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg"><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(s.student_id)} className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 border border-pink-100 dark:border-gray-800 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-pink-50">{formData.student_id ? 'Edit Student' : 'New Student'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Register No</label>
                <input required type="text" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-pink-500 dark:text-white outline-none" value={formData.register_no} onChange={e => setFormData({...formData, register_no: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Full Name</label>
                <input required type="text" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-pink-500 dark:text-white outline-none" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Batch ID</label>
                <input required type="number" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-pink-500 dark:text-white outline-none" value={formData.batch_id} onChange={e => setFormData({...formData, batch_id: parseInt(e.target.value) || ''})} />
              </div>
              <button type="submit" className="w-full mt-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg">{formData.student_id ? 'Save Changes' : 'Create Student'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}