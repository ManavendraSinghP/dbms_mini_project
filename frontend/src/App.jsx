import React, { useState, useEffect } from 'react';
import { Search, Moon, Sun, Play, Server, AlertCircle, LayoutGrid, X, Users, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [relaxCapacity, setRelaxCapacity] = useState(false);

  const [allStudents, setAllStudents] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [displayCount, setDisplayCount] = useState(50);

  const [timetableData, setTimetableData] = useState(null);
  const [systemLogs, setSystemLogs] = useState([{ type: "info", msg: "System initialized. Ready for scheduling." }]);
  const [stats, setStats] = useState({ latency: 0, totalAllocations: 0 });
  const [seatingGrid, setSeatingGrid] = useState(null);

  const [viewerSession, setViewerSession] = useState(1);
  const [viewerRoomId, setViewerRoomId] = useState("");

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const studentRes = await fetch(`${API_BASE}/students`);
        const studentData = await studentRes.json();
        const sortedStudents = studentData.sort((a, b) => String(a.register_no).localeCompare(String(b.register_no)));
        setAllStudents(sortedStudents);

        const roomRes = await fetch(`${API_BASE}/rooms`);
        const roomData = await roomRes.json();
        setAllRooms(roomData);
        if (roomData.length > 0) setViewerRoomId(roomData[0].room_id);
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (viewerRoomId && viewerSession && timetableData) {
      fetchSeatingGrid(viewerRoomId, viewerSession);
    }
  }, [viewerRoomId, viewerSession, timetableData]);

  const handleTableScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      setDisplayCount(prev => Math.min(prev + 50, allStudents.length));
    }
  };

  const logMessage = (type, msg) => {
    setSystemLogs(prev => [...prev, { type, msg, time: new Date().toLocaleTimeString() }]);
  };

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(null);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/search?query=${searchQuery}`);
        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        console.error("Search failed");
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleResultClick = (item) => {
    if (item.student_id) {
      const fullProfile = allStudents.find(s => s.student_id === item.student_id);
      setSelectedEntity(fullProfile || item);
    } else {
      setSelectedEntity(item);
    }
    setSearchQuery("");
    setSearchResults(null);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setSystemLogs([]);
    setTimetableData(null);
    setSeatingGrid(null);
    logMessage("info", "Initiating solver engine...");

    try {
      const res = await fetch(`${API_BASE}/timetable/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relax_capacity: relaxCapacity })
      });
      const data = await res.json();

      if (!res.ok) {
        logMessage("error", `[${data.conflict_type}] ${data.details}`);
      } else {
        setTimetableData(data.timetable);
        setStats({ latency: data.latency_ms, totalAllocations: data.total_allocations });
        logMessage("success", `Timetable generated in ${data.latency_ms}ms with ${data.total_allocations} allocations.`);

        const studentRes = await fetch(`${API_BASE}/students`);
        const studentData = await studentRes.json();
        setAllStudents(studentData.sort((a, b) => String(a.register_no).localeCompare(String(b.register_no))));
      }
    } catch (err) {
      logMessage("error", "Network error: Failed to reach the solver API.");
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchSeatingGrid = async (roomId, sessionId) => {
    try {
      logMessage("info", `Fetching seating layout for Room ID ${roomId}, Slot ${sessionId}...`);
      const res = await fetch(`${API_BASE}/seating/${roomId}/${sessionId}`);
      const data = await res.json();
      if (res.ok) setSeatingGrid(data);
      else logMessage("error", data.message || "Failed to fetch grid.");
    } catch (err) {
      logMessage("error", "Network error fetching seating data.");
    }
  };

  const groupedRooms = allRooms.reduce((acc, room) => {
    if (!acc[room.building_name]) acc[room.building_name] = [];
    acc[room.building_name].push(room);
    return acc;
  }, {});

  // FORCE MAX 5 SLOTS FOR THE CHART
  const sessionChartData = timetableData?.slice(0, 5).map((s, i) => ({
    name: `Slot ${i + 1}`,
    courses: s.courses.length,
  })) || [];

  const pieData = [
    { name: 'Occupied Seats', value: stats.totalAllocations },
    { name: 'Empty Gap Seats', value: relaxCapacity ? 0 : stats.totalAllocations },
  ];
  const PIE_COLORS = ['#f43f5e', '#94a3b8'];

  const getCourseColor = (courseCode) => {
    if (!courseCode) return "";
    const colors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500", "bg-cyan-500"];
    let hash = 0;
    for (let i = 0; i < courseCode.length; i++) hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="min-h-screen bg-pink-50 dark:bg-gray-950 text-rose-950 dark:text-gray-100 font-sans transition-colors duration-300">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-pink-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <LayoutGrid className="w-6 h-6 text-rose-600 dark:text-indigo-400" />
            <h1 className="font-bold text-xl tracking-tight">Christ NCR<span className="text-rose-600 dark:text-indigo-400"> Planner</span></h1>
          </div>

          <div className="relative w-96">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search students, courses, rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-pink-100/50 dark:bg-gray-800 border-transparent focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-rose-400 dark:focus:ring-indigo-500 outline-none transition-all text-sm"
            />
            {searchResults && (
              <div className="absolute top-12 w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-pink-100 dark:border-gray-700 overflow-hidden max-h-96 overflow-y-auto">
                {['students', 'courses', 'rooms'].map(category => (
                  searchResults[category]?.length > 0 && (
                    <div key={category} className="p-2 border-b border-pink-50 dark:border-gray-700 last:border-0">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 px-2">{category}</h3>
                      {searchResults[category].map(item => (
                        <div
                          key={item.id || item.student_id || item.course_id}
                          onClick={() => handleResultClick(item)}
                          className="text-sm p-2 hover:bg-pink-100 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors"
                        >
                          {item.full_name || item.title || item.room_number} <span className="text-gray-400 text-xs">({item.register_no || item.course_code || item.building_name})</span>
                        </div>
                      ))}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-full hover:bg-pink-100 dark:hover:bg-gray-800 transition-colors bg-pink-100 dark:bg-gray-800">
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-rose-900" />}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {selectedEntity && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-md border-2 border-rose-300 dark:border-indigo-500 relative flex flex-col">
            <button
              onClick={() => setSelectedEntity(null)}
              className="absolute top-4 right-4 p-1 hover:bg-pink-50 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-rose-500 dark:hover:text-indigo-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-pink-100 dark:bg-gray-800 rounded-full">
                <Users className="w-6 h-6 text-rose-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-rose-900 dark:text-gray-100">Profile Lookup</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">Name</p>
                <p className="font-semibold text-base">{selectedEntity.full_name || selectedEntity.title || selectedEntity.room_number}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">Reg. No.</p>
                <p className="font-semibold text-base font-mono bg-pink-50 dark:bg-gray-800 inline-block px-2 py-0.5 rounded">{selectedEntity.register_no || selectedEntity.course_code || selectedEntity.building_name}</p>
              </div>
              {selectedEntity.semester_label && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">Batch</p>
                  <p className="font-semibold text-base">{selectedEntity.semester_label}</p>
                </div>
              )}
            </div>

            {selectedEntity.schedule && Object.keys(selectedEntity.schedule).length > 0 && (
              <div className="border-t border-pink-100 dark:border-gray-800 pt-4">
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-3">Assigned Exam Slots</p>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(selectedEntity.schedule).map(([slotName, details]) => (
                    <div key={slotName} className="flex items-center bg-pink-50 dark:bg-gray-800 border border-pink-200 dark:border-gray-700 rounded-lg px-3 py-2">
                      <span className="font-bold text-rose-600 dark:text-indigo-400 mr-2 text-xs uppercase">{slotName}:</span>
                      <span className="font-mono text-sm">{details}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-pink-100 dark:border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-xl text-rose-900 dark:text-gray-100">Campus Student Directory</h2>
            <span className="text-xs bg-pink-100 dark:bg-gray-800 px-3 py-1 rounded-full font-mono">Total Records: {allStudents.length}</span>
          </div>

          <div
            onScroll={handleTableScroll}
            className="overflow-x-auto max-h-96 border border-pink-100 dark:border-gray-800 rounded-xl scroll-smooth"
          >
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="sticky top-0 bg-pink-50 dark:bg-gray-800 text-rose-900 dark:text-gray-200 z-10 shadow-sm">
                <tr>
                  <th className="p-3 border-b border-pink-200 dark:border-gray-700 font-semibold text-xs uppercase tracking-wider">Reg No.</th>
                  <th className="p-3 border-b border-pink-200 dark:border-gray-700 font-semibold text-xs uppercase tracking-wider">Full Name</th>
                  <th className="p-3 border-b border-pink-200 dark:border-gray-700 font-semibold text-xs uppercase tracking-wider">Slot 1</th>
                  <th className="p-3 border-b border-pink-200 dark:border-gray-700 font-semibold text-xs uppercase tracking-wider">Slot 2</th>
                  <th className="p-3 border-b border-pink-200 dark:border-gray-700 font-semibold text-xs uppercase tracking-wider">Slot 3</th>
                  <th className="p-3 border-b border-pink-200 dark:border-gray-700 font-semibold text-xs uppercase tracking-wider">Slot 4</th>
                  <th className="p-3 border-b border-pink-200 dark:border-gray-700 font-semibold text-xs uppercase tracking-wider">Slot 5</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50 dark:divide-gray-800">
                {allStudents.slice(0, displayCount).map((student) => (
                  <tr
                    key={student.student_id}
                    className="hover:bg-pink-50/50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 transition-colors whitespace-nowrap"
                  >
                    <td className="p-3 font-mono text-xs">{student.register_no}</td>
                    <td className="p-3 font-medium text-sm">{student.full_name}</td>
                    {[1, 2, 3, 4, 5].map(slotNum => (
                      <td key={slotNum} className="p-3 text-xs font-mono text-gray-500 dark:text-gray-400">
                        {student.schedule?.[`Slot ${slotNum}`] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
                {allStudents.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-500">Loading student directory...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-pink-100 dark:border-gray-800 flex flex-col justify-between">
            <div>
              <h2 className="font-semibold text-lg mb-4 flex items-center"><Server className="w-5 h-5 mr-2" /> Solver Controls</h2>
              <label className="flex items-center space-x-3 cursor-pointer mb-6 text-sm">
                <input type="checkbox" checked={relaxCapacity} onChange={() => setRelaxCapacity(!relaxCapacity)} className="form-checkbox rounded text-rose-500 focus:ring-rose-500 bg-pink-100 dark:bg-gray-800 border-transparent w-5 h-5" />
                <span>Relax Capacity Limits (Test Mode)</span>
              </label>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl font-medium shadow-md shadow-rose-200 dark:shadow-none transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Play className="w-5 h-5 mr-2 fill-current" />}
              {isGenerating ? "Solving Constraints..." : "Generate Timetable"}
            </button>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-pink-100 dark:border-gray-800">
             <h2 className="font-semibold text-sm text-gray-500 mb-2">Courses per Session</h2>
             <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sessionChartData}>
                    <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" />
                    <YAxis fontSize={12} stroke="#94a3b8" />
                    <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: isDark ? '#1f2937' : '#fff', borderRadius: '8px', border: 'none', color: isDark ? '#fff' : '#000'}} />
                    <Bar dataKey="courses" fill={isDark ? '#6366f1' : '#e11d48'} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-pink-100 dark:border-gray-800 flex flex-col items-center">
             <h2 className="font-semibold text-sm text-gray-500 w-full mb-2">Campus Seat Utilization</h2>
             <div className="h-40 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{backgroundColor: isDark ? '#1f2937' : '#fff', borderRadius: '8px', border: 'none'}} />
                  </PieChart>
               </ResponsiveContainer>
             </div>
             <div className="text-xs text-center mt-2 font-mono text-gray-400">Total Latency: {stats.latency} ms</div>
          </div>
        </div>

        {timetableData && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-pink-100 dark:border-gray-800">
            <h2 className="font-bold text-xl mb-4">Generated Timetable Matrix</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* FORCE MAX 5 SLOTS FOR THE MATRIX */}
              {timetableData.slice(0, 5).map((slot, idx) => (
                <div key={idx} className="border border-pink-100 dark:border-gray-700 rounded-xl p-4 bg-pink-50/50 dark:bg-gray-800/50 hover:border-rose-300 dark:hover:border-indigo-500 transition-colors cursor-pointer" onClick={() => setViewerSession(slot.session_id)}>
                   <div className="flex justify-between items-center mb-2">
                     <span className="font-bold text-sm uppercase tracking-wider text-rose-600 dark:text-indigo-400">Slot {idx + 1}</span>
                     <span className="text-xs font-mono bg-white dark:bg-gray-900 px-2 py-1 rounded text-gray-500">{slot.exam_date} | {slot.start_time}</span>
                   </div>
                   <div className="space-y-1">
                     {slot.courses.map(c => (
                       <div key={c.course_id} className="text-sm font-medium flex items-center">
                         <span className="w-2 h-2 rounded-full mr-2 bg-gray-400" /> {c.course_code} - <span className="text-gray-500 text-xs ml-1 truncate">{c.title}</span>
                       </div>
                     ))}
                   </div>
                   <div className="mt-4 text-xs text-rose-400 dark:text-indigo-400 italic font-semibold hover:underline">Click to view spatial seating map for this slot</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-pink-100 dark:border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 space-y-4 md:space-y-0">
            <div>
              <h2 className="font-bold text-xl flex items-center"><MapPin className="w-5 h-5 mr-2 text-rose-600 dark:text-indigo-400"/> Room Layout Visualizer</h2>

              <div className="flex flex-wrap gap-3 mt-4">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 uppercase tracking-wider">Exam Session</label>
                  <select
                    value={viewerSession}
                    onChange={e => setViewerSession(Number(e.target.value))}
                    className="bg-pink-50 dark:bg-gray-800 border border-pink-200 dark:border-gray-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-rose-400"
                  >
                    {[1, 2, 3, 4, 5].map(s => <option key={s} value={s}>Slot {s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 uppercase tracking-wider">Building / Block & Room</label>
                  <select
                    value={viewerRoomId}
                    onChange={e => setViewerRoomId(Number(e.target.value))}
                    className="bg-pink-50 dark:bg-gray-800 border border-pink-200 dark:border-gray-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-rose-400"
                  >
                    {Object.entries(groupedRooms).map(([block, rooms]) => (
                      <optgroup key={block} label={block}>
                        {rooms.map(r => (
                          <option key={r.room_id} value={r.room_id}>Room {r.room_number}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {seatingGrid && (
              <div className="text-sm font-mono bg-pink-100 dark:bg-gray-800 px-3 py-1 rounded-lg border border-pink-200 dark:border-gray-700 text-center">
                <span className="block text-[10px] uppercase text-gray-500">Utilization</span>
                Occupied: {seatingGrid.total_assigned}/50
              </div>
            )}
          </div>

          {seatingGrid ? (
            <div className="overflow-x-auto pb-4 pt-4 border-t border-pink-100 dark:border-gray-800">
              <div className="min-w-[800px] flex flex-col space-y-3">
                {seatingGrid.grid.map((row, rIdx) => (
                  <div key={rIdx} className="flex justify-center space-x-3">
                    {row.map((cell, cIdx) => (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        title={cell.status === 'occupied' ? `${cell.full_name} (${cell.register_no})\nCourse: ${cell.course_code}` : 'Empty Gap Seat'}
                        className={`
                          w-14 h-14 rounded-lg flex flex-col items-center justify-center text-[10px] text-center font-medium border transition-transform hover:scale-110 cursor-help
                          ${(cIdx === 2 || cIdx === 6) ? 'mr-6' : ''}
                          ${cell.status === 'occupied'
                            ? `${getCourseColor(cell.course_code)} text-white border-transparent shadow-sm`
                            : 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600'}
                        `}
                      >
                        {cell.status === 'occupied' ? (
                          <>
                            <span className="font-bold font-mono">{cell.register_no?.slice(-4)}</span>
                            <span className="opacity-90">{cell.course_code}</span>
                          </>
                        ) : (
                          <span className="opacity-30">Gap</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400 border-t border-pink-100 dark:border-gray-800">
              {timetableData ? "Select a valid Slot and Room above to view the layout." : "Generate a timetable first to view seating allocations."}
            </div>
          )}
        </div>

        <div className="bg-pink-50/50 dark:bg-gray-950 rounded-2xl p-4 shadow-sm dark:shadow-xl border border-pink-200 dark:border-gray-800 font-mono text-sm transition-colors">
          <div className="flex items-center text-rose-800 dark:text-gray-500 mb-3 text-xs uppercase tracking-widest border-b border-pink-200 dark:border-gray-800 pb-2">
             <AlertCircle className="w-4 h-4 mr-2 text-rose-500 dark:text-gray-500" /> Failure Engine & Diagnostics Logs
          </div>
          <div className="h-40 overflow-y-auto space-y-2">
            {systemLogs.map((log, i) => (
              <div key={i} className={`flex ${log.type === 'error' ? 'text-red-500 dark:text-red-400 font-bold' : log.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                <span className="text-gray-400 dark:text-gray-600 mr-3">[{log.time}]</span>
                <span>{log.msg}</span>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}