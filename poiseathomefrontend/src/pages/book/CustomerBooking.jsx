import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchApi } from '../../services/api';
import { formatMoney, formatDuration, getTodayDateString } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, ArrowRight, CheckCircle, Clock, Calendar as CalendarIcon, User, MapPin, Scissors, ShieldCheck } from 'lucide-react';
import BrandLogo from '../../components/BrandLogo';

const CustomerBooking = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [slots, setSlots] = useState([]);
  
  const initialService = searchParams.get('service') ? [parseInt(searchParams.get('service'), 10)] : [];
  const [selectedServiceIds, setSelectedServiceIds] = useState(initialService);
  const [extendedMinutes, setExtendedMinutes] = useState(0);

  const [booking, setBooking] = useState({
    staff_id: '',
    date: '',
    start_time: '',
    service_address: user?.address || '',
    address_notes: '',
    customer_notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdAppointment, setCreatedAppointment] = useState(null);
  const stepLabels = ['Services', 'Hairstylist', 'Date & time', 'Location', 'Review'];

  // Step 1: Load Services
  useEffect(() => {
    if (step === 1) {
      setLoading(true);
      fetchApi('/services?home_service=true')
        .then(res => res.json())
        .then(data => {
          setServices(data.data || []);
          setLoading(false);
        })
        .catch(() => {
          setServices([]);
          setLoading(false);
        });
    }
  }, [step]);

  // Step 2: Load Qualified Staff for ALL selected services
  useEffect(() => {
    if (step === 2 && selectedServiceIds.length > 0) {
      setLoading(true);
      const query = selectedServiceIds.join(',');
      fetchApi(`/booking/services/${selectedServiceIds[0]}/staff?service_ids=${query}`)
        .then(res => res.json())
        .then(data => {
          setStaffList(data.data || []);
          setLoading(false);
        })
        .catch(() => {
          setStaffList([]);
          setLoading(false);
        });
    }
  }, [step, selectedServiceIds]);

  const toggleServiceSelection = (id) => {
    const numId = parseInt(id, 10);
    setSelectedServiceIds(prev => 
      prev.includes(numId) ? prev.filter(x => x !== numId) : [...prev, numId]
    );
  };

  const getSelectedServices = () => services.filter(s => selectedServiceIds.includes(s.id));
  const getSelectedStaff = () => staffList.find(s => s.id == booking.staff_id);

  const totalDuration = getSelectedServices().reduce((sum, s) => sum + (parseInt(s.duration_minutes, 10) || 0), 0) + extendedMinutes;
  const totalPrice = getSelectedServices().reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);

  // Step 3: Check Availability
  const checkAvailability = async (date) => {
    setBooking(prev => ({ ...prev, date, start_time: '' }));
    setSlots([]);
    setError('');
    if (!date || selectedServiceIds.length === 0 || !booking.staff_id) return;
    
    setLoading(true);
    try {
      const query = selectedServiceIds.join(',');
      const res = await fetchApi(`/booking/availability?service_ids=${query}&staff_id=${booking.staff_id}&date=${date}&extended_minutes=${extendedMinutes}`);
      const data = await res.json();
      if (res.ok) {
        setSlots(data.data.slots || []);
      } else {
        setSlots([]);
        setError(data.message || 'Availability could not be loaded. Please try again.');
      }
    } catch (e) {
      setSlots([]);
      setError('Availability could not be loaded because of a network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitBooking = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        service_id: selectedServiceIds[0],
        service_ids: selectedServiceIds,
        staff_id: booking.staff_id,
        date: booking.date,
        start_time: booking.start_time,
        service_address: booking.service_address,
        address_notes: booking.address_notes || null,
        customer_notes: booking.customer_notes || null,
        extended_minutes: extendedMinutes,
      };

      const res = await fetchApi('/appointments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedAppointment(data.data);
        setStep(6); // Success step
      } else {
        setError(data.message || 'Failed to book appointment.');
        if (data.code === 'APPOINTMENT_SLOT_UNAVAILABLE') {
          setStep(3);
          checkAvailability(booking.date); // refresh slots
        }
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-text-primary">
      <header className="border-b border-purple-100 bg-white"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"><Link to="/"><BrandLogo imageClassName="h-10 w-10" textClassName="text-lg" /></Link><Link to="/account/appointments" className="text-sm font-semibold text-primary-deep hover:underline">My appointments</Link></div></header>
      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
        <Link to="/services" className="mb-7 inline-flex items-center text-sm font-medium text-text-muted transition-colors hover:text-primary-purple">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Browse services
        </Link>

        {step < 6 && (
          <div className="mb-7 overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm">
            <div className="relative overflow-hidden bg-[#301837] px-6 py-7 text-white sm:px-8"><div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-fuchsia-500/25 blur-3xl" /><div className="relative"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-fuchsia-200"><Scissors className="h-4 w-4" /> Home salon booking</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Build your appointment</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Choose the care, professional, and time that work best for you.</p></div></div>
            <ol className="grid grid-cols-5 gap-1 px-3 py-5 sm:px-8" aria-label="Booking progress">
              {[1, 2, 3, 4, 5].map(s => (
                <li key={s} className="min-w-0 text-center" aria-current={step === s ? 'step' : undefined}>
                  <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition ${step === s ? 'bg-primary-purple text-white shadow-md shadow-purple-200' : step > s ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-gray-100 text-gray-500'}`}>
                    {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                  </div>
                  <span className={`mt-2 hidden truncate text-xs sm:block ${step === s ? 'font-semibold text-primary-deep' : 'text-text-muted'}`}>{stepLabels[s - 1]}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">{error}</div>}

        <div className="min-h-[400px] overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-sm">
          
          {/* STEP 1: SERVICES & EXTEND TIME */}
          {step === 1 && (
            <div className="p-6 md:p-8">
              <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.15em] text-primary-purple">Step 1 of 5</p>
                  <h2 className="mt-2 text-2xl font-bold">Select services</h2>
                  <p className="mt-1 text-sm text-text-muted">Choose one or more treatments you would like for your home visit.</p>
                </div>
                {selectedServiceIds.length > 0 && (
                  <div className="rounded-xl bg-lavender px-4 py-2 text-right text-xs font-semibold text-primary-deep">
                    <span>{selectedServiceIds.length} service{selectedServiceIds.length > 1 ? 's' : ''} selected</span>
                    <span className="mx-2 text-purple-300">•</span>
                    <span>{formatDuration(totalDuration)}</span>
                    <span className="mx-2 text-purple-300">•</span>
                    <span className="text-sm font-bold text-primary-purple">{formatMoney(totalPrice)}</span>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="text-center py-8 text-text-muted">Loading services...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {services.map(svc => {
                    const isSelected = selectedServiceIds.includes(svc.id);
                    return (
                      <button
                        type="button"
                        key={svc.id} 
                        onClick={() => toggleServiceSelection(svc.id)}
                        className={`group relative w-full rounded-2xl border p-5 text-left transition ${isSelected ? 'border-primary-purple bg-lavender/60 ring-2 ring-primary-purple/30 shadow-sm' : 'border-gray-200 hover:-translate-y-0.5 hover:border-primary-purple/50 hover:shadow-sm'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-bold text-text-primary mb-1">{svc.name}</h3>
                          <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${isSelected ? 'border-primary-purple bg-primary-purple text-white' : 'border-gray-300 bg-white group-hover:border-primary-purple'}`}>
                            {isSelected && <CheckCircle className="h-4 w-4" />}
                          </div>
                        </div>
                        <p className="text-sm text-text-muted mb-3 line-clamp-2">{svc.description}</p>
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span className="text-text-muted">{formatDuration(svc.duration_minutes)}</span>
                          <span className="text-primary-purple font-bold">{formatMoney(svc.price)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Sir Prado: Extend-Time Feature for Scheduling */}
              <div className="mt-8 rounded-2xl border border-purple-100 bg-purple-50/40 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-primary-purple" />
                      Need extra appointment time? (Optional)
                    </h4>
                    <p className="text-xs text-text-muted mt-0.5">Add extra buffer minutes for thicker hair, detailed styling, or comprehensive consultation.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[0, 15, 30, 45, 60].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setExtendedMinutes(mins)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${extendedMinutes === mins ? 'bg-primary-purple text-white shadow-sm' : 'bg-white border border-gray-200 text-text-primary hover:border-primary-purple'}`}
                      >
                        {mins === 0 ? 'Standard' : `+${mins} min`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-5">
                <p className="text-xs text-text-muted">
                  {selectedServiceIds.length === 0 ? 'Select at least one service to continue' : `${selectedServiceIds.length} item(s) selected`}
                </p>
                <button 
                  disabled={selectedServiceIds.length === 0} 
                  onClick={() => setStep(2)}
                  className="btn-primary"
                >
                  Continue to Stylist <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: STAFF */}
          {step === 2 && (
            <div className="p-6 md:p-8">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-[.15em] text-primary-purple">Step 2 of 5</p>
                <h2 className="mt-2 text-2xl font-bold">Choose your hairstylist</h2>
                <p className="mt-1 text-sm text-text-muted">Select a professional qualified for all your selected services.</p>
              </div>

              {loading ? (
                <div className="text-center py-8 text-text-muted">Finding qualified professionals...</div>
              ) : staffList.length === 0 ? (
                <div className="text-center py-8 text-text-muted rounded-xl bg-gray-50 border border-gray-200 p-6">
                  <p className="font-semibold text-text-primary">No hairstylists currently available for all selected services.</p>
                  <p className="text-sm text-text-muted mt-1">Please try modifying your selected services or choose fewer items.</p>
                  <button onClick={() => setStep(1)} className="btn-outline mt-4">Adjust Service Selection</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {staffList.map(staff => (
                    <button type="button"
                      key={staff.id} 
                      onClick={() => setBooking({...booking, staff_id: staff.id})}
                      className={`flex w-full items-center rounded-2xl border p-4 text-left transition ${booking.staff_id == staff.id ? 'border-primary-purple bg-lavender/60 ring-2 ring-primary-purple/30' : 'border-gray-200 hover:border-primary-purple/50 hover:shadow-sm'}`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center mr-4 shrink-0">
                        {staff.profile_photo_url ? (
                          <img src={staff.profile_photo_url} className="w-full h-full object-cover" alt={`${staff.display_name} profile`} />
                        ) : <User className="w-6 h-6 text-gray-400" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-text-primary">{staff.display_name}</h3>
                        <p className="text-sm text-text-muted">{staff.specialization || 'Qualified Stylist'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(1)} className="btn-ghost">Back</button>
                <button 
                  disabled={!booking.staff_id} 
                  onClick={() => setStep(3)}
                  className="btn-primary"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DATE & TIME */}
          {step === 3 && (
            <div className="p-6 md:p-8">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-[.15em] text-primary-purple">Step 3 of 5</p>
                <h2 className="mt-2 text-2xl font-bold">Choose a date and time</h2>
                <p className="mt-1 text-sm text-text-muted">Available appointment slots calculated for your total duration ({formatDuration(totalDuration)}).</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Date</label>
                <input 
                  type="date" 
                  min={getTodayDateString()}
                  value={booking.date} 
                  onChange={e => checkAvailability(e.target.value)}
                  className="w-full md:w-1/2 px-4 py-3 border border-gray-200 rounded-xl focus:ring-primary-purple focus:border-primary-purple"
                />
              </div>

              {booking.date && (
                <div>
                  <label className="block text-sm font-medium mb-2">Available Times</label>
                  {loading ? (
                    <div className="text-sm text-text-muted">Loading slots...</div>
                  ) : slots.length === 0 ? (
                    <div className="text-sm text-orange-600 bg-orange-50 p-4 rounded-xl border border-orange-100">No available slots for this date. Please select another date.</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {slots.map((slot, idx) => (
                        <button 
                          key={idx}
                          type="button"
                          onClick={() => setBooking({...booking, start_time: slot.start})}
                          className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-medium ${booking.start_time === slot.start ? 'border-primary-purple bg-primary-purple text-white' : 'border-gray-200 bg-white text-text-primary hover:border-primary-purple'}`}
                        >
                          {slot.start} - {slot.end}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(2)} className="btn-ghost">Back</button>
                <button 
                  disabled={!booking.date || !booking.start_time} 
                  onClick={() => setStep(4)}
                  className="btn-primary"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: HOME DETAILS */}
          {step === 4 && (
            <div className="p-6 md:p-8">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-[.15em] text-primary-purple">Step 4 of 5</p>
                <h2 className="mt-2 text-2xl font-bold">Where should we meet you?</h2>
                <p className="mt-1 text-sm text-text-muted">Confirm the location and add anything your stylist should know.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Service Address *</label>
                  <textarea 
                    required 
                    rows="3" 
                    value={booking.service_address} 
                    onChange={e => setBooking({...booking, service_address: e.target.value})}
                    placeholder="Enter full home address"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-primary-purple focus:border-primary-purple"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address Notes (Optional)</label>
                  <input 
                    type="text" 
                    value={booking.address_notes} 
                    onChange={e => setBooking({...booking, address_notes: e.target.value})}
                    placeholder="e.g. Blue gate, 2nd floor"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-primary-purple focus:border-primary-purple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Appointment Notes (Optional)</label>
                  <textarea 
                    rows="2" 
                    value={booking.customer_notes} 
                    onChange={e => setBooking({...booking, customer_notes: e.target.value})}
                    placeholder="Any specific requests or hair history?"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-primary-purple focus:border-primary-purple"
                  ></textarea>
                </div>
              </div>
              
              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(3)} className="btn-ghost">Back</button>
                <button 
                  disabled={!booking.service_address.trim()} 
                  onClick={() => setStep(5)}
                  className="btn-primary"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW */}
          {step === 5 && (
            <div className="p-6 md:p-8">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-[.15em] text-primary-purple">Step 5 of 5</p>
                <h2 className="mt-2 text-2xl font-bold">Review your appointment</h2>
                <p className="mt-1 text-sm text-text-muted">Make sure every detail is correct before confirming.</p>
              </div>
              
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-4 mb-8">
                <div>
                  <p className="text-sm font-semibold text-text-muted mb-2">Selected Services ({getSelectedServices().length})</p>
                  <div className="divide-y divide-gray-200 border-y border-gray-200">
                    {getSelectedServices().map(s => (
                      <div key={s.id} className="flex justify-between py-2.5 text-sm">
                        <div>
                          <p className="font-semibold text-text-primary">{s.name}</p>
                          <p className="text-xs text-text-muted">{formatDuration(s.duration_minutes)}</p>
                        </div>
                        <span className="font-semibold text-text-primary">{formatMoney(s.price)}</span>
                      </div>
                    ))}
                    {extendedMinutes > 0 && (
                      <div className="flex justify-between py-2 text-sm text-primary-deep bg-purple-50/50 px-2 rounded">
                        <span>Extended Time Buffer</span>
                        <span className="font-semibold">+{extendedMinutes} mins</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between pt-3 font-bold text-text-primary">
                    <span>Total Estimated Duration: {formatDuration(totalDuration)}</span>
                    <span className="text-lg text-primary-purple">{formatMoney(totalPrice)}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-text-muted mb-1">Date</p>
                    <p className="font-medium flex items-center"><CalendarIcon className="w-4 h-4 mr-1.5 text-primary-purple"/> {booking.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted mb-1">Start Time</p>
                    <p className="font-medium flex items-center"><Clock className="w-4 h-4 mr-1.5 text-primary-purple"/> {booking.start_time}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-text-muted mb-1">Hairstylist</p>
                    <p className="font-medium flex items-center"><User className="w-4 h-4 mr-1.5 text-primary-purple"/> {getSelectedStaff()?.display_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted mb-1">Location</p>
                    <p className="font-medium flex items-start"><MapPin className="w-4 h-4 mr-1.5 mt-0.5 text-primary-purple shrink-0"/> <span className="line-clamp-2">{booking.service_address}</span></p>
                  </div>
                </div>
              </div>

              <div className="flex items-start rounded-xl border border-purple-100 bg-lavender/50 p-4 text-sm font-medium text-primary-deep">
                <ShieldCheck className="mr-3 mt-0.5 h-5 w-5 shrink-0" />
                <p>By confirming, you agree to the appointment schedule. You will be required to submit a 30% downpayment ({formatMoney(totalPrice * 0.3)}) on the next screen to verify your booking.</p>
              </div>

              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(4)} disabled={loading} className="btn-ghost">Back</button>
                <button 
                  disabled={loading} 
                  onClick={submitBooking}
                  className="btn-primary"
                >
                  {loading ? 'Confirming...' : 'Confirm Appointment'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: SUCCESS */}
          {step === 6 && (
            <div className="flex min-h-[460px] flex-col items-center justify-center bg-gradient-to-b from-green-50/60 to-white p-8 text-center sm:p-12">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-700 shadow-sm">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-semibold text-text-primary mb-2">Appointment booked</h2>
              <p className="text-text-muted mb-2">Your appointment number is <strong className="font-mono text-text-primary">{createdAppointment?.appointment_number}</strong>.</p>
              <p className="text-sm text-text-muted mb-8">Submit your downpayment proof so the salon can review and confirm your appointment.</p>
              
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-8 max-w-md w-full mx-auto text-left">
                <h3 className="font-bold text-lg mb-4 text-center">Next Step — Downpayment</h3>
                <div className="flex justify-between items-center mb-2 text-sm">
                  <span className="text-text-muted">Total Service Cost:</span>
                  <span className="font-semibold">{formatMoney(createdAppointment?.service_price_snapshot)}</span>
                </div>
                <div className="flex justify-between items-center mb-4 text-sm">
                  <span className="text-text-muted">Required Downpayment (30%):</span>
                  <span className="font-bold text-primary-purple text-lg">{formatMoney(createdAppointment?.required_downpayment_amount)}</span>
                </div>
                <div className="text-xs text-text-muted text-center pt-4 border-t border-gray-200">
                  Status: Pending | Payment: Not Submitted
                </div>
              </div>

              <Link to={`/account/appointments/${createdAppointment?.id}`} className="btn-primary w-full max-w-sm">
                View Appointment and Submit Downpayment
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CustomerBooking;
