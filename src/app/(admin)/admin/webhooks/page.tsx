import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default async function AdminWebhooksPage() {
  const webhooks = await prisma.webhookLog.findMany({
    orderBy: { processedAt: 'desc' },
    take: 100,
  });

  const stats = {
    total: webhooks.length,
    success: webhooks.filter((w) => w.status === 'success').length,
    failed: webhooks.filter((w) => w.status === 'failed').length,
    ignored: webhooks.filter((w) => w.status === 'ignored').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhook Logs</h1>
          <p className="text-gray-600 mt-1">
            Monitor incoming webhooks from GoHighLevel and other sources
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.success}</p>
              <p className="text-xs text-gray-500">Success</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.failed}</p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.ignored}</p>
              <p className="text-xs text-gray-500">Ignored</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook Endpoint Info */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <h3 className="font-medium text-gray-900 mb-2">Webhook Endpoint</h3>
          <code className="block p-3 bg-white rounded border text-sm break-all">
            {process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/webhooks/ghl
          </code>
          <p className="text-sm text-gray-500 mt-2">
            Configure this URL in GoHighLevel to receive purchase notifications
          </p>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Recent Webhooks</h3>
            <a
              href="/admin/webhooks"
              className="text-sm text-maxxed-blue hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </a>
          </div>

          {webhooks.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No webhook logs yet</p>
              <p className="text-sm">Webhooks will appear here when received</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      Source
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      Event
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      Time
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {webhooks.map((webhook) => (
                    <tr key={webhook.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded font-medium ${
                            webhook.status === 'success'
                              ? 'bg-green-100 text-green-700'
                              : webhook.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {webhook.status === 'success' && <CheckCircle className="w-3 h-3" />}
                          {webhook.status === 'failed' && <XCircle className="w-3 h-3" />}
                          {webhook.status === 'ignored' && <AlertCircle className="w-3 h-3" />}
                          {webhook.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {webhook.source}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {webhook.event}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(webhook.processedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {webhook.errorMessage ? (
                          <span className="text-sm text-red-600">
                            {webhook.errorMessage}
                          </span>
                        ) : (
                          <details className="text-sm">
                            <summary className="cursor-pointer text-maxxed-blue hover:underline">
                              View payload
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-w-xs max-h-40">
                              {JSON.stringify(webhook.payload, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
