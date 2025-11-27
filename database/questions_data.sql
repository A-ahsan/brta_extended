-- Bulk INSERT statements for BRTA exam questions
-- Run this after creating the questions table

INSERT INTO questions (
  question_text_en,
  question_text_bn,
  question_type,
  option_a_en,
  option_a_bn,
  option_b_en,
  option_b_bn,
  option_c_en,
  option_c_bn,
  option_d_en,
  option_d_bn,
  correct_answer
) VALUES
('Which side of the road should you drive on in Bangladesh?', 'বাংলাদেশে রাস্তার কোন পাশে গাড়ি চালাতে হয়?', 'mcq', 'Left side', 'বাম পাশে', 'Right side', 'ডান পাশে', 'Both', 'উভয় পাশে', 'Center', 'মাঝখানে', 'A'),
('What is the legal minimum age to drive a motorcycle (up to 100cc)?', 'মোটরসাইকেল (১০০ সিসি পর্যন্ত) চালানোর আইনগত ন্যূনতম বয়স কত?', 'mcq', '16 years', '১৬ বছর', '18 years', '১৮ বছর', '20 years', '২০ বছর', '21 years', '২১ বছর', 'B'),
('Before overtaking another vehicle, you must:', 'অন্য যানবাহনকে ওভারটেক করার আগে আপনার কী করা উচিত?', 'mcq', 'Honk continuously', 'অবিরত হর্ন দেওয়া', 'Give proper signal and check mirrors', 'যথাযথ সিগন্যাল দেওয়া ও আয়না পরীক্ষা করা', 'Speed up', 'গতি বাড়ানো', 'Do nothing', 'কিছুই না করা', 'B'),
('What does a red traffic light mean?', 'লাল ট্রাফিক লাইটের অর্থ কী?', 'mcq', 'Stop', 'থামুন', 'Go', 'যান', 'Slow down', 'গতি কমান', 'Turn left', 'বামে ঘুরুন', 'A'),
('What is the purpose of a zebra crossing?', 'জেব্রা ক্রসিং এর উদ্দেশ্য কী?', 'mcq', 'Vehicle parking', 'যানবাহন পার্কিং', 'Pedestrian crossing', 'পথচারী পারাপার', 'Overtaking zone', 'ওভারটেকিং জোন', 'No entry zone', 'প্রবেশ নিষিদ্ধ এলাকা', 'B'),
('What should you do when driving in heavy rain?', 'ভারী বৃষ্টিতে গাড়ি চালানোর সময় কী করবেন?', 'mcq', 'Drive fast', 'দ্রুত গাড়ি চালান', 'Use hazard lights', 'হ্যাজার্ড লাইট ব্যবহার করুন', 'Use wiper and slow down', 'ওয়াইপার ব্যবহার করুন এবং গতি কমান', 'Turn off headlights', 'হেডলাইট বন্ধ করুন', 'C');
