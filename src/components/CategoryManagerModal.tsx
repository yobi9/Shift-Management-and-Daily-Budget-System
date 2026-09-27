/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Category, TransactionType } from '../types';
import { storageService } from '../services/storage';
import { Tags, Plus, Trash2, TrendingUp, TrendingDown, Check } from 'lucide-react';

export const CategoryManagerModal: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<TransactionType>('income');
  const [isLoading, setIsLoading] = useState(false);

  const loadCategories = async () => {
    const cats = await storageService.getCategories();
    setCategories(cats);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsLoading(true);
    const newCat: Category = {
      id: 'cat_' + Date.now(),
      name: newName.trim(),
      type: newType,
      isSystem: false
    };

    await storageService.saveCategory(newCat);
    setNewName('');
    setIsLoading(false);
    loadCategories();
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (cat.isSystem) {
      alert('هذه الفئة أساسية من النظام ولا يمكن حذفها.');
      return;
    }
    if (window.confirm(`هل أنت متأكد من حذف فئة "${cat.name}"؟`)) {
      await storageService.deleteCategory(cat.id);
      loadCategories();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <Tags className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-900">إدارة فئات الإيرادات والمصروفات</h2>
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="sm:col-span-6">
            <label className="block text-xs font-semibold text-slate-700 mb-1">اسم الفئة الجديدة *</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="مثلاً: صيانة أجهزة، إكراميات..."
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">النوع</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewType('income')}
                className={`py-2 px-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                  newType === 'income'
                    ? 'bg-emerald-100/60 border-emerald-300 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>إيراد (+)</span>
              </button>
              <button
                type="button"
                onClick={() => setNewType('expense')}
                className={`py-2 px-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                  newType === 'expense'
                    ? 'bg-rose-100/60 border-rose-300 text-rose-800'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                <span>مصروف (-)</span>
              </button>
            </div>
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={isLoading || !newName.trim()}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة</span>
            </button>
          </div>
        </form>

        {/* Existing Categories Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Income Categories */}
          <div>
            <h3 className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>فئات الإيرادات ({categories.filter(c => c.type === 'income').length})</span>
            </h3>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {categories
                .filter(c => c.type === 'income')
                .map(cat => (
                  <div key={cat.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{cat.name}</span>
                      {cat.isSystem && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">افتراضية</span>
                      )}
                    </div>
                    {!cat.isSystem && (
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="حذف الفئة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Expense Categories */}
          <div>
            <h3 className="text-xs font-bold text-rose-800 mb-2 flex items-center gap-1">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <span>فئات المصروفات ({categories.filter(c => c.type === 'expense').length})</span>
            </h3>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {categories
                .filter(c => c.type === 'expense')
                .map(cat => (
                  <div key={cat.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{cat.name}</span>
                      {cat.isSystem && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">افتراضية</span>
                      )}
                    </div>
                    {!cat.isSystem && (
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="حذف الفئة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
