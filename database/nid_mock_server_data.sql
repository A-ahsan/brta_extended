-- Sample NID Data for Mock Server
-- Run this after creating the nid_mock_server table

INSERT INTO nid_mock_server (
  nid_number,
  full_name_en,
  full_name_bn,
  father_name,
  mother_name,
  date_of_birth,
  gender,
  blood_group,
  division,
  district,
  upazila,
  address
) VALUES
('1234567890123', 'Ahmed Hassan Khan', 'আহমেদ হাসান খান', 'Hassan Ali Khan', 'Fatima Begum', '1995-03-15', 'Male', 'B+', 'Dhaka', 'Dhaka', 'Mirpur', 'House 25, Road 5, Block C, Mirpur-10'),
('7814144619', 'Alif Ahsan', 'আলিফ আহসান', 'Kamrul Ahsan', 'Soheli Parvin', '2002-12-04', 'Male', 'O+', 'Dhaka', 'Dhaka', 'Nesarabad', 'Pirojpur, Nesarabad, 333/k, t'),
('9876543210987', 'Ayesha Rahman', 'আয়েশা রহমান', 'Abdul Rahman', 'Sultana Parvin', '1998-07-22', 'Female', 'A+', 'Dhaka', 'Dhaka', 'Dhanmondi', 'Flat 4B, House 12, Road 8, Dhanmondi'),
('5678901234567', 'Mohammad Karim Uddin', 'মোহাম্মদ করিম উদ্দিন', 'Abdul Karim', 'Rahima Khatun', '1990-11-05', 'Male', 'O+', 'Chittagong', 'Chittagong', 'Halishahar', 'House 45, Lane 7, Halishahar Housing Estate'),
('2345678901234', 'Nusrat Jahan', 'নুসরাত জাহান', 'Jahangir Alam', 'Nasima Akter', '1993-09-18', 'Female', 'AB+', 'Dhaka', 'Gazipur', 'Tongi', 'Holding 234, Ward 5, Tongi'),
('8901234567890', 'Rafiqul Islam', 'রফিকুল ইসলাম', 'Azizul Haque', 'Amena Begum', '1988-01-30', 'Male', 'A-', 'Rajshahi', 'Rajshahi', 'Boalia', 'Village: Shaheb Bazar, Post: Boalia'),
('3456789012345', 'Sharmin Sultana', 'শারমিন সুলতানা', 'Sultan Ahmed', 'Shirina Khatun', '1996-05-12', 'Female', 'B-', 'Sylhet', 'Sylhet', 'Sylhet Sadar', 'House 78, Zindabazar, Sylhet'),
('6789012345678', 'Tanvir Hossain', 'তানভীর হোসেন', 'Mofizur Rahman', 'Parveen Akter', '1992-12-08', 'Male', 'O-', 'Khulna', 'Khulna', 'Khulna Sadar', 'Road 3, Sonadanga Residential Area'),
('4567890123456', 'Farzana Yasmin', 'ফারজানা ইয়াসমিন', 'Yasir Ali', 'Rozina Begum', '1997-04-25', 'Female', 'AB-', 'Dhaka', 'Dhaka', 'Uttara', 'House 15, Road 12, Sector 7, Uttara'),
('7890123456789', 'Syed Imran Ali', 'সৈয়দ ইমরান আলী', 'Syed Kamal Uddin', 'Syeda Rukshana', '1991-08-14', 'Male', 'A+', 'Barisal', 'Barisal', 'Barisal Sadar', 'Sagordi, Kawnia Road, Barisal'),
('1357924680246', 'Meher Afroz', 'মেহের আফরোজ', 'Afroz Mia', 'Kulsum Begum', '1994-02-20', 'Female', 'B+', 'Rangpur', 'Rangpur', 'Rangpur Sadar', 'Holding 89, Modern More, Rangpur')
ON CONFLICT (nid_number) DO NOTHING;

-- Add more sample data as needed
-- You can easily add more records using the same format
