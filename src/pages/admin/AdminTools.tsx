import React, { useState, useEffect } from "react";
import { Plus, Edit2, ToggleLeft, ToggleRight, Trash2, AlertTriangle } from "lucide-react";
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc, deleteDoc, where, writeBatch } from "firebase/firestore";
import { db } from "../../firebase";
import { DEFAULT_TOOLS, syncDefaultTools } from "../../lib/defaultTools";

type Tool = {
  id: string;
  tool_name: string;
  description: string;
  credit_cost: number;
  category: string;
  enabled: boolean;
};

export function AdminTools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTool, setEditingTool] = useState<string | null>(null);
  const [deletingTool, setDeletingTool] = useState<Tool | null>(null);

  const [formData, setFormData] = useState({
    tool_name: "",
    description: "",
    credit_cost: 0,
    category: "General",
    enabled: true,
    status: "working",
  });

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const toolsRef = collection(db, "tools");
      const q = query(toolsRef, orderBy("tool_name", "asc"));
      const querySnapshot = await getDocs(q);
      
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Tool));
      
      setTools(data);
    } catch (error) {
      console.error(error);
    }
  };

  const restoreDefaultTools = async () => {
    try {
      await syncDefaultTools(true);
      alert("Default tools restoration complete.");
      fetchTools();
    } catch (error) {
      console.error("Failed to restore default tools", error);
      alert("Failed to restore default tools.");
    }
  };

  const cleanupDuplicates = async () => {
    try {
      const toolsRef = collection(db, "tools");
      const q = query(toolsRef, orderBy("tool_name", "asc"));
      const querySnapshot = await getDocs(q);
      
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Tool));

      const seen = new Map<string, string>();
      const duplicates: string[] = [];

      data.forEach(tool => {
        const normalizedName = tool.tool_name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen.has(normalizedName)) {
          duplicates.push(tool.id);
        } else {
          seen.set(normalizedName, tool.id);
        }
      });

      if (duplicates.length > 0) {
        if (confirm(`Found ${duplicates.length} duplicate tools. Delete them?`)) {
          const batch = writeBatch(db);
          duplicates.forEach(id => {
            batch.delete(doc(db, "tools", id));
          });
          await batch.commit();
          
          alert(`Deleted ${duplicates.length} duplicate tools.`);
          fetchTools();
        }
      } else {
        alert("No duplicate tools found.");
      }
    } catch (error) {
      console.error("Failed to cleanup duplicates", error);
      alert("Failed to cleanup duplicates.");
    }
  };

  const handleSave = async () => {
    try {
      const descriptionToSave = `${formData.description.replace(/\[STATUS:(working|development)\]/g, '').trim()} [STATUS:${formData.status}]`;
      const dataToSave = {
        tool_name: formData.tool_name,
        description: descriptionToSave,
        credit_cost: formData.credit_cost,
        category: formData.category,
        enabled: formData.enabled,
      };

      if (editingTool) {
        const toolRef = doc(db, "tools", editingTool);
        await updateDoc(toolRef, dataToSave);
      } else {
        const toolsRef = collection(db, "tools");
        await addDoc(toolsRef, dataToSave);
      }

      setIsAdding(false);
      setEditingTool(null);
      setFormData({
        tool_name: "",
        description: "",
        credit_cost: 0,
        category: "General",
        enabled: true,
        status: "working",
      });
      fetchTools();
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleEnable = async (tool: Tool) => {
    try {
      const toolRef = doc(db, "tools", tool.id);
      await updateDoc(toolRef, { enabled: !tool.enabled });
      fetchTools();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const toolRef = doc(db, "tools", id);
      await deleteDoc(toolRef);
      setDeletingTool(null);
      fetchTools();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manage Tools</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Add, edit, and configure platform tools.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={cleanupDuplicates}
            className="flex items-center justify-center px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            Cleanup Duplicates
          </button>
          <button
            onClick={restoreDefaultTools}
            className="flex items-center justify-center px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            Restore Default Tools
          </button>
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingTool(null);
              setFormData({
                tool_name: "",
                description: "",
                credit_cost: 0,
                category: "General",
                enabled: true,
                status: "working",
              });
            }}
            className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" /> Add Tool
          </button>
        </div>
      </div>

      {(isAdding || editingTool) && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
            {editingTool ? "Edit Tool" : "Add New Tool"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Tool Name
              </label>
              <input
                type="text"
                value={formData.tool_name}
                onChange={(e) =>
                  setFormData({ ...formData, tool_name: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              >
                <option value="working">🟢 Working</option>
                <option value="development">🟠 Under Development</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Credit Cost
              </label>
              <input
                type="number"
                value={formData.credit_cost}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    credit_cost: parseInt(e.target.value, 10),
                  })
                }
                className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              />
            </div>
            <div className="flex items-center mt-6">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) =>
                  setFormData({ ...formData, enabled: e.target.checked })
                }
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 rounded"
              />
              <label htmlFor="enabled" className="ml-2 block text-sm text-slate-900 dark:text-slate-300">
                Enabled
              </label>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => {
                setIsAdding(false);
                setEditingTool(null);
              }}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Save Tool
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Tool Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
              {tools.map((tool) => {
                const statusMatch = tool.description.match(/\[STATUS:(working|development)\]/);
                const status = statusMatch ? statusMatch[1] : 'working';
                const cleanDesc = tool.description.replace(/\[STATUS:(working|development)\]/g, '').trim();
                
                return (
                <tr key={tool.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      {tool.tool_name}
                      {status === 'working' ? (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full" title="Working">🟢 Working</span>
                      ) : (
                        <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full" title="Under Development">🟠 Dev</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                      {cleanDesc}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300">
                      {tool.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600 dark:text-amber-400 font-medium">
                    💳 {tool.credit_cost}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleEnable(tool)}
                      className={`flex items-center ${
                        tool.enabled ? "text-green-600 dark:text-green-400" : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {tool.enabled ? (
                        <ToggleRight className="w-6 h-6" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                      <span className="ml-2 text-sm">
                        {tool.enabled ? "Active" : "Disabled"}
                      </span>
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={() => {
                          setEditingTool(tool.id);
                          setFormData({
                            tool_name: tool.tool_name,
                            description: cleanDesc,
                            credit_cost: tool.credit_cost,
                            category: tool.category,
                            enabled: Boolean(tool.enabled),
                            status: status,
                          });
                          setIsAdding(false);
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors"
                        title="Edit Tool"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingTool(tool)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                        title="Delete Tool"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {/* Mobile List */}
        <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
          {tools.map((tool) => {
            const statusMatch = tool.description.match(/\[STATUS:(working|development)\]/);
            const status = statusMatch ? statusMatch[1] : 'working';
            const cleanDesc = tool.description.replace(/\[STATUS:(working|development)\]/g, '').trim();

            return (
            <div key={tool.id} className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {tool.tool_name}
                    {status === 'working' ? (
                      <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full" title="Working">🟢</span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full" title="Under Development">🟠</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                    {cleanDesc}
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                  {tool.category}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center">
                    <span className="mr-1">💳</span>
                    {tool.credit_cost}
                  </div>
                  <button
                    onClick={() => handleToggleEnable(tool)}
                    className={`flex items-center text-xs font-semibold ${
                      tool.enabled ? "text-green-600 dark:text-green-400" : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {tool.enabled ? (
                      <ToggleRight className="w-5 h-5 mr-1" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 mr-1" />
                    )}
                    {tool.enabled ? "Active" : "Disabled"}
                  </button>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setEditingTool(tool.id);
                      setFormData({
                        tool_name: tool.tool_name,
                        description: cleanDesc,
                        credit_cost: tool.credit_cost,
                        category: tool.category,
                        enabled: Boolean(tool.enabled),
                        status: status,
                      });
                      setIsAdding(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-indigo-600 dark:text-indigo-400"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingTool(tool)}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )})}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingTool && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full mb-4 mx-auto">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">
              Delete Tool?
            </h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-6">
              Do you really want to delete <span className="font-bold text-slate-900 dark:text-white">"{deletingTool.tool_name}"</span>? This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setDeletingTool(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingTool.id)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
              >
                Delete Tool
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
