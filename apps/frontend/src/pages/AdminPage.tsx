import { useState } from 'react'
import {
  useApprovePremiumRequest,
  usePremiumRequests,
  useRejectPremiumRequest,
} from '@/hooks/usePremium'
import type { PremiumRequestDto, PremiumRequestStatus } from '@stocktracker/types'

const TABS: { label: string; value: PremiumRequestStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

export function AdminPage() {
  const [tab, setTab] = useState<PremiumRequestStatus>('pending')
  const { data: requests = [], isLoading } = usePremiumRequests(tab)
  const { mutate: approve, isPending: isApproving } = useApprovePremiumRequest()
  const { mutate: reject, isPending: isRejecting } = useRejectPremiumRequest()
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [adminNote, setAdminNote] = useState('')

  function handleReject(id: string) {
    reject(
      { id, adminNote: adminNote.trim() || undefined },
      {
        onSuccess: () => {
          setRejectTarget(null)
          setAdminNote('')
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="text-lg font-semibold text-slate-800">Premium Requests</h1>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
              tab === t.value
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Header */}
        <div className="flex items-center border-b border-slate-100 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <div className="flex-1">User</div>
          <div className="w-44">Requested</div>
          <div className="w-28">Status</div>
          <div className="w-48 text-right">Actions</div>
        </div>

        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            No {tab} requests
          </div>
        ) : (
          requests.map((req) => (
            <RequestRow
              key={req.id}
              req={req}
              isApproving={isApproving}
              isRejecting={isRejecting}
              rejectTarget={rejectTarget}
              adminNote={adminNote}
              onApprove={() => approve(req.id)}
              onOpenReject={() => {
                setRejectTarget(req.id)
                setAdminNote('')
              }}
              onCancelReject={() => setRejectTarget(null)}
              onAdminNoteChange={setAdminNote}
              onConfirmReject={() => handleReject(req.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface RowProps {
  req: PremiumRequestDto
  isApproving: boolean
  isRejecting: boolean
  rejectTarget: string | null
  adminNote: string
  onApprove: () => void
  onOpenReject: () => void
  onCancelReject: () => void
  onAdminNoteChange: (v: string) => void
  onConfirmReject: () => void
}

function RequestRow({
  req,
  isApproving,
  isRejecting,
  rejectTarget,
  adminNote,
  onApprove,
  onOpenReject,
  onCancelReject,
  onAdminNoteChange,
  onConfirmReject,
}: RowProps) {
  const initial = req.userEmail[0]?.toUpperCase() ?? '?'
  const isRejectOpen = rejectTarget === req.id

  return (
    <div className="border-b border-slate-50 last:border-0">
      <div className="flex items-center px-5 py-4">
        {/* User */}
        <div className="flex flex-1 items-center gap-2.5">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-semibold text-white">
            {initial}
          </div>
          <p className="text-xs font-medium text-slate-800">{req.userEmail}</p>
        </div>

        {/* Date */}
        <div className="w-44 text-xs text-slate-500">
          {new Date(req.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>

        {/* Status badge */}
        <div className="w-28">
          <StatusBadge status={req.status} />
        </div>

        {/* Actions */}
        <div className="flex w-48 justify-end gap-2">
          {req.status === 'pending' ? (
            <>
              <button
                type="button"
                onClick={onOpenReject}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-100 transition-colors"
              >
                Reject
              </button>
              <button
                type="button"
                disabled={isApproving}
                onClick={onApprove}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Approve
              </button>
            </>
          ) : (
            <span className="text-[10px] text-slate-400 italic">
              {req.adminNote ?? '—'}
            </span>
          )}
        </div>
      </div>

      {/* Inline reject form */}
      {isRejectOpen && (
        <div className="mx-5 mb-4 rounded-lg border border-red-100 bg-red-50 p-4 space-y-3">
          <p className="text-xs font-medium text-red-700">
            Rejecting request from {req.userEmail}
          </p>
          <textarea
            rows={2}
            value={adminNote}
            onChange={(e) => onAdminNoteChange(e.target.value)}
            placeholder="Admin note (optional — sent to user in email)"
            className="w-full resize-none rounded-lg border border-red-200 px-3 py-2 text-xs placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelReject}
              className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isRejecting}
              onClick={onConfirmReject}
              className="rounded-lg bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: PremiumRequestStatus }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }
  const dots = {
    pending: 'bg-amber-500',
    approved: 'bg-green-500',
    rejected: 'bg-red-500',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
