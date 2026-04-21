import { useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useHouseWallet, useAdminSettings, useAdminUsers, useAdminGameRounds, useDepositRequests, useWithdrawalRequests } from '@/hooks/use-game-data';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Shield, Users, Wallet, BarChart3, Key, DollarSign, Gamepad2, Save, Plus, Trash2, ArrowDownLeft, ArrowUpRight, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminPage() {
  const { profile, isAuthenticated } = useAppStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const { data: houseWallet, isLoading: hwLoading } = useHouseWallet();
  const { data: adminSettings, isLoading: settingsLoading, refetch: refetchSettings } = useAdminSettings();
  const { data: users, isLoading: usersLoading } = useAdminUsers();
  const { data: gameRounds, isLoading: roundsLoading } = useAdminGameRounds();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyDesc, setNewKeyDesc] = useState('');
  const { data: deposits, refetch: refetchDeposits } = useDepositRequests();
  const { data: withdrawals, refetch: refetchWithdrawals } = useWithdrawalRequests();
  const qc = useQueryClient();
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  if (!isAuthenticated || !profile?.is_admin) {
    return (
      <div className="text-center py-16">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <div className="font-display font-bold text-foreground">Admin access required</div>
        <div className="text-sm text-muted-foreground mt-1">Sign in with an admin account.</div>
      </div>
    );
  }

  const saveKey = async (settingId: string) => {
    if (!tempValue) return;
    const { error } = await supabase.from('admin_settings').update({ value: tempValue }).eq('id', settingId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Saved' }); refetchSettings(); }
    setEditingKey(null); setTempValue('');
  };

  const addNewKey = async () => {
    if (!newKeyName) return;
    const { error } = await supabase.from('admin_settings').insert({ key: newKeyName, value: newKeyValue, description: newKeyDesc, is_secret: true });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Added' }); refetchSettings(); setNewKeyName(''); setNewKeyValue(''); setNewKeyDesc(''); }
  };

  const deleteKey = async (id: string) => {
    const { error } = await supabase.from('admin_settings').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Deleted' }); refetchSettings(); }
  };

  const handleDeposit = async (id: string, approve: boolean) => {
    const note = noteMap[id] || undefined;
    const { data, error } = await supabase.rpc(approve ? 'approve_deposit' : 'reject_deposit', { p_request_id: id, p_note: note });
    const result = data as { error?: string } | null;
    if (error || result?.error) toast({ title: 'Error', description: result?.error || error?.message, variant: 'destructive' });
    else { toast({ title: approve ? 'Deposit approved' : 'Deposit rejected' }); refetchDeposits(); qc.invalidateQueries({ queryKey: ['house-wallet'] }); }
  };
  const handleWithdrawal = async (id: string, approve: boolean) => {
    const note = noteMap[id] || undefined;
    const { data, error } = await supabase.rpc(approve ? 'approve_withdrawal' : 'reject_withdrawal', { p_request_id: id, p_note: note });
    const result = data as { error?: string } | null;
    if (error || result?.error) toast({ title: 'Error', description: result?.error || error?.message, variant: 'destructive' });
    else { toast({ title: approve ? 'Withdrawal paid' : 'Withdrawal rejected & refunded' }); refetchWithdrawals(); }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'deposits', label: `Deposits${deposits?.filter(d => d.status === 'pending').length ? ` (${deposits.filter(d => d.status === 'pending').length})` : ''}`, icon: ArrowDownLeft },
    { id: 'withdrawals', label: `Withdrawals${withdrawals?.filter(w => w.status === 'pending').length ? ` (${withdrawals.filter(w => w.status === 'pending').length})` : ''}`, icon: ArrowUpRight },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'wallet', label: 'House Wallet', icon: Wallet },
    { id: 'games', label: 'Game Rounds', icon: Gamepad2 },
    { id: 'api-keys', label: 'API Keys', icon: Key },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-primary" />
        <h1 className="font-display font-extrabold text-2xl text-foreground">Admin Panel</h1>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id ? 'gradient-primary text-foreground' : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
            }`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'House Balance', value: hwLoading ? '...' : `$${Number(houseWallet?.balance ?? 0).toFixed(2)}`, icon: '💰', cls: 'text-glow-green' },
            { title: 'Total Users', value: usersLoading ? '...' : String(users?.length ?? 0), icon: '👥', cls: 'text-glow-blue' },
            { title: 'Total Bets', value: roundsLoading ? '...' : String(gameRounds?.length ?? 0), icon: '🎲', cls: 'text-glow-gold' },
            { title: 'Total Bets $', value: hwLoading ? '...' : `$${Number(houseWallet?.total_bets ?? 0).toFixed(2)}`, icon: '📊', cls: 'text-glow-blue' },
            { title: 'Total Payouts', value: hwLoading ? '...' : `$${Number(houseWallet?.total_payouts ?? 0).toFixed(2)}`, icon: '💸', cls: 'text-glow-red' },
            { title: 'House Profit', value: hwLoading ? '...' : `$${(Number(houseWallet?.total_bets ?? 0) - Number(houseWallet?.total_payouts ?? 0)).toFixed(2)}`, icon: '📈', cls: 'text-glow-gold' },
          ].map(item => (
            <div key={item.title} className="p-6 rounded-2xl bg-surface border border-border">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className={`font-mono font-bold text-xl ${item.cls}`}>{item.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{item.title}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'deposits' && (
        <div className="p-6 rounded-2xl bg-surface border border-border">
          <h3 className="font-display font-bold text-lg text-foreground mb-4">Deposit Requests</h3>
          {!deposits?.length ? <div className="text-center py-8 text-muted-foreground text-sm">No deposits yet.</div> : (
            <div className="space-y-2">
              {deposits.map((d) => (
                <div key={d.id} className="p-4 rounded-xl bg-void border border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-foreground">${Number(d.amount).toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">{d.method}{d.crypto_currency ? ` · ${d.crypto_currency}` : ''}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${d.status === 'approved' ? 'bg-neon-green/10 text-glow-green' : d.status === 'rejected' ? 'bg-neon-red/10 text-glow-red' : 'bg-neon-gold/10 text-glow-gold'}`}>{d.status}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 font-mono break-all">{d.tx_hash || 'Card payment'}</div>
                      <div className="text-[10px] text-muted-foreground">{d.created_at ? new Date(d.created_at).toLocaleString() : ''} · user {d.user_id.slice(0, 8)}</div>
                    </div>
                    {d.status === 'pending' && (
                      <div className="flex gap-1 shrink-0">
                        <input placeholder="Note" value={noteMap[d.id] || ''} onChange={(e) => setNoteMap({ ...noteMap, [d.id]: e.target.value })} className="px-2 py-1 rounded-lg bg-surface border border-border text-foreground text-xs w-24" />
                        <button onClick={() => handleDeposit(d.id, true)} className="p-2 rounded-lg bg-neon-green/10 text-glow-green hover:bg-neon-green/20"><Check className="w-4 h-4" /></button>
                        <button onClick={() => handleDeposit(d.id, false)} className="p-2 rounded-lg bg-neon-red/10 text-glow-red hover:bg-neon-red/20"><X className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <div className="p-6 rounded-2xl bg-surface border border-border">
          <h3 className="font-display font-bold text-lg text-foreground mb-4">Withdrawal Requests</h3>
          {!withdrawals?.length ? <div className="text-center py-8 text-muted-foreground text-sm">No withdrawals yet.</div> : (
            <div className="space-y-2">
              {withdrawals.map((w) => (
                <div key={w.id} className="p-4 rounded-xl bg-void border border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-foreground">${Number(w.amount).toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">{w.method}{w.crypto_currency ? ` · ${w.crypto_currency}` : ''}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${w.status === 'paid' ? 'bg-neon-green/10 text-glow-green' : w.status === 'rejected' ? 'bg-neon-red/10 text-glow-red' : 'bg-neon-gold/10 text-glow-gold'}`}>{w.status}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 font-mono break-all">→ {w.destination}</div>
                      <div className="text-[10px] text-muted-foreground">{w.created_at ? new Date(w.created_at).toLocaleString() : ''} · user {w.user_id.slice(0, 8)}</div>
                    </div>
                    {w.status === 'pending' && (
                      <div className="flex gap-1 shrink-0">
                        <input placeholder="Note" value={noteMap[w.id] || ''} onChange={(e) => setNoteMap({ ...noteMap, [w.id]: e.target.value })} className="px-2 py-1 rounded-lg bg-surface border border-border text-foreground text-xs w-24" />
                        <button onClick={() => handleWithdrawal(w.id, true)} className="p-2 rounded-lg bg-neon-green/10 text-glow-green hover:bg-neon-green/20"><Check className="w-4 h-4" /></button>
                        <button onClick={() => handleWithdrawal(w.id, false)} className="p-2 rounded-lg bg-neon-red/10 text-glow-red hover:bg-neon-red/20"><X className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="p-6 rounded-2xl bg-surface border border-border">
          <h3 className="font-display font-bold text-lg text-foreground mb-4">House Wallet</h3>
          {hwLoading ? <div className="shimmer h-32 rounded-xl" /> : (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-neon-green mx-auto mb-2" />
              <div className="font-mono font-extrabold text-4xl text-glow-green">${Number(houseWallet?.balance ?? 0).toFixed(2)}</div>
              <div className="text-sm text-muted-foreground mt-2">Total house earnings from player losses</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'api-keys' && (
        <div className="p-6 rounded-2xl bg-surface border border-border space-y-4">
          <h3 className="font-display font-bold text-lg text-foreground">Settings & API Keys</h3>
          {settingsLoading ? <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="shimmer h-16 rounded-xl"/>)}</div> : (
            <div className="space-y-3">
              {(adminSettings??[]).map(s=>(
                <div key={s.id} className="flex items-center gap-3 p-4 rounded-xl bg-void border border-border">
                  <Key className="w-4 h-4 text-neon-gold shrink-0"/>
                  <div className="flex-1">
                    <div className="font-mono text-sm font-bold text-foreground">{s.key}</div>
                    {s.description&&<div className="text-[10px] text-muted-foreground">{s.description}</div>}
                    {editingKey===s.id?(
                      <div className="flex gap-2 mt-2">
                        <input type={s.is_secret?'password':'text'} value={tempValue} onChange={e=>setTempValue(e.target.value)} placeholder="New value..." className="flex-1 px-3 py-1.5 rounded-lg bg-surface border border-border text-foreground text-sm font-mono focus:border-neon-blue focus:outline-none"/>
                        <button onClick={()=>saveKey(s.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold gradient-primary text-foreground"><Save className="w-3 h-3"/></button>
                        <button onClick={()=>{setEditingKey(null);setTempValue('');}} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-elevated border border-border text-foreground">Cancel</button>
                      </div>
                    ):<div className="font-mono text-xs text-muted-foreground mt-0.5">{s.is_secret?'••••••••':(s.value||'(empty)')}</div>}
                  </div>
                  {editingKey!==s.id&&(
                    <div className="flex gap-1">
                      <button onClick={()=>{setEditingKey(s.id);setTempValue(s.value??'');}} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-elevated border border-border text-foreground hover:border-neon-blue/30">Edit</button>
                      <button onClick={()=>deleteKey(s.id)} className="px-2 py-1.5 rounded-lg text-xs bg-elevated border border-border text-glow-red hover:border-neon-red/30"><Trash2 className="w-3 h-3"/></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="p-4 rounded-xl bg-void border border-border space-y-3">
            <div className="text-sm font-bold text-foreground flex items-center gap-2"><Plus className="w-4 h-4"/> Add New</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input value={newKeyName} onChange={e=>setNewKeyName(e.target.value)} placeholder="KEY_NAME" className="px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm font-mono focus:border-neon-blue focus:outline-none"/>
              <input value={newKeyValue} onChange={e=>setNewKeyValue(e.target.value)} placeholder="Value" type="password" className="px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm font-mono focus:border-neon-blue focus:outline-none"/>
              <input value={newKeyDesc} onChange={e=>setNewKeyDesc(e.target.value)} placeholder="Description" className="px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm font-mono focus:border-neon-blue focus:outline-none"/>
            </div>
            <button onClick={addNewKey} disabled={!newKeyName} className="px-4 py-2 rounded-xl text-sm font-bold gradient-primary text-foreground disabled:opacity-50">Add</button>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="p-6 rounded-2xl bg-surface border border-border">
          <h3 className="font-display font-bold text-lg text-foreground mb-4">Users</h3>
          {usersLoading?<div className="shimmer h-40 rounded-xl"/>:!(users?.length)?<div className="text-center py-8 text-muted-foreground text-sm">No users yet.</div>:(
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground text-xs border-b border-border"><th className="pb-2">Username</th><th className="pb-2">Name</th><th className="pb-2">Lvl</th><th className="pb-2">XP</th><th className="pb-2">Joined</th></tr></thead>
              <tbody>{users.map(u=>(
                <tr key={u.id} className="border-b border-border/50">
                  <td className="py-3 font-bold text-foreground">{u.username??'N/A'}</td>
                  <td className="py-3 text-muted-foreground">{u.display_name??'N/A'}</td>
                  <td className="py-3 font-mono">{u.level}</td>
                  <td className="py-3 font-mono">{u.xp}</td>
                  <td className="py-3 text-muted-foreground text-xs">{u.created_at?new Date(u.created_at).toLocaleDateString():''}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {activeTab === 'games' && (
        <div className="p-6 rounded-2xl bg-surface border border-border">
          <h3 className="font-display font-bold text-lg text-foreground mb-4">Recent Game Rounds</h3>
          {roundsLoading?<div className="shimmer h-40 rounded-xl"/>:!(gameRounds?.length)?<div className="text-center py-8 text-muted-foreground text-sm">No rounds yet. All values start at zero.</div>:(
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground text-xs border-b border-border"><th className="pb-2">Game</th><th className="pb-2">Bet</th><th className="pb-2">Multi</th><th className="pb-2">Payout</th><th className="pb-2">Won</th><th className="pb-2">Time</th></tr></thead>
              <tbody>{gameRounds.slice(0,50).map(r=>(
                <tr key={r.id} className="border-b border-border/50">
                  <td className="py-3 font-bold text-foreground">{r.game_type}</td>
                  <td className="py-3 font-mono">${Number(r.bet_amount).toFixed(2)}</td>
                  <td className="py-3 font-mono">{Number(r.multiplier??0).toFixed(2)}×</td>
                  <td className="py-3 font-mono">${Number(r.payout??0).toFixed(2)}</td>
                  <td className="py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.won?'bg-neon-green/10 text-glow-green':'bg-neon-red/10 text-glow-red'}`}>{r.won?'Won':'Lost'}</span></td>
                  <td className="py-3 text-muted-foreground text-xs">{r.created_at?new Date(r.created_at).toLocaleString():''}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}
    </div>
  );
}
