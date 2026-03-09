// Excel Export Utility - Creates CSV files that can be opened in Excel

export interface ExportColumn {
  header: string;
  accessor: string | ((row: any) => string);
}

export function exportToExcel(data: any[], columns: ExportColumn[], filename: string) {
  // Create CSV content
  const headers = columns.map(col => `"${col.header}"`).join(',');
  
  const rows = data.map(row => {
    return columns.map(col => {
      let value = '';
      if (typeof col.accessor === 'function') {
        value = col.accessor(row);
      } else {
        value = row[col.accessor] ?? '';
      }
      // Escape double quotes and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csvContent = [headers, ...rows].join('\n');
  
  // Add BOM for Excel to recognize UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Predefined export configurations
export const taskExportColumns: ExportColumn[] = [
  { header: 'Title', accessor: 'title' },
  { header: 'Description', accessor: 'description' },
  { header: 'Status', accessor: 'status' },
  { header: 'Priority', accessor: 'priority' },
  { header: 'Employee', accessor: (row) => row.employee?.name || 'Unassigned' },
  { header: 'Project', accessor: (row) => row.project?.title || 'No Project' },
  { header: 'Due Date', accessor: 'due_date' },
  { header: 'Created At', accessor: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '' },
  { header: 'Completed At', accessor: (row) => row.completed_at ? new Date(row.completed_at).toLocaleDateString() : '' },
];

export const employeeExportColumns: ExportColumn[] = [
  { header: 'Name', accessor: 'name' },
  { header: 'Email', accessor: 'email' },
  { header: 'Phone', accessor: 'phone' },
  { header: 'Department', accessor: 'department' },
  { header: 'Designation', accessor: 'designation' },
  { header: 'Status', accessor: (row) => row.is_active ? 'Active' : 'Inactive' },
  { header: 'Created At', accessor: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '' },
];

export const projectReportExportColumns: ExportColumn[] = [
  { header: 'Project', accessor: 'project_name' },
  { header: 'Total Tasks', accessor: 'total' },
  { header: 'Completed', accessor: 'completed' },
  { header: 'In Progress', accessor: 'in_progress' },
  { header: 'Pending', accessor: 'pending' },
  { header: 'Completion Rate', accessor: (row) => row.total > 0 ? `${Math.round((row.completed / row.total) * 100)}%` : '0%' },
];

export const departmentReportExportColumns: ExportColumn[] = [
  { header: 'Department', accessor: 'department_name' },
  { header: 'Total Tasks', accessor: 'total' },
  { header: 'Completed', accessor: 'completed' },
  { header: 'In Progress', accessor: 'in_progress' },
  { header: 'Pending', accessor: 'pending' },
  { header: 'Completion Rate', accessor: (row) => row.total > 0 ? `${Math.round((row.completed / row.total) * 100)}%` : '0%' },
];

export const employeeProgressExportColumns: ExportColumn[] = [
  { header: 'Employee', accessor: 'name' },
  { header: 'Department', accessor: 'department_name' },
  { header: 'Total Tasks', accessor: 'total_tasks' },
  { header: 'Completed Tasks', accessor: 'completed_tasks' },
  { header: 'Completion Rate', accessor: (row) => `${row.completion_rate}%` },
  { header: 'Recent Updates (7d)', accessor: 'recent_updates' },
];
