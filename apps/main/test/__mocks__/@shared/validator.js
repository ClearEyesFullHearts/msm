const mockValidateUser = jest.fn();

const mock = jest.fn().mockImplementation(() => ({ validateUser: mockValidateUser }));

module.exports = mock;
module.exports.mockValidateUser = mockValidateUser;
